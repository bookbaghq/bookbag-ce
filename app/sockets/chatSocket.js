const master = require('mastercontroller');
const StreamingService = require(`${master.root}/components/chats/app/service/streamingService`);
const MessagePersistenceService = require(`${master.root}/components/chats/app/service/messagePersistenceService`);
const ChatHistoryService = require(`${master.root}/components/chats/app/service/chatHistoryService`);
const ModelService = require(`${master.root}/components/chats/app/service/modelService`);
const llmConfigService = require("../../components/models/app/service/llmConfigService");
const errorService = require(`${master.root}/app/service/errorService`);
const { HOOKS } = require(`${master.root}/bb-plugins/plugin-plugin/app/core/hookConstants`);
const hookService = require(`${master.root}/bb-plugins/plugin-plugin/app/core/hookRegistration`);

// AI Image handling imports
const ResponseNormalizationService = require(`${master.root}/components/chats/app/service/responseNormalizationService`);
const MediaService = require(`${master.root}/components/media/app/service/mediaService`);

class chatSocket {

	constructor(dependencies) {
		// Dependency injection with sensible defaults
		const deps = dependencies || {};
		this.modelService = deps.modelService || ModelService.getInstance();
		this.streamingService = deps.streamingService || StreamingService.getInstance();
	}

	/**
	 * Extract base URL from HTTP request
	 * @param {Object} req - HTTP request object
	 * @returns {string} Base URL (e.g., "http://147.182.251.85:8080")
	 */
	_getBaseUrlFromRequest(req) {
		if (!req) {
			console.warn('⚠️  No request object available, using fallback URL');
			return 'http://localhost:8080';
		}

		try {
			// Get protocol from request or socket
			const protocol = req.protocol ||
				(req.connection?.encrypted ? 'https' : 'http') ||
				(req.secure ? 'https' : 'http');

			// Get host from headers (includes port if non-standard)
			const host = req.headers?.host || req.get?.('host') || 'localhost:8080';

			const baseUrl = `${protocol}://${host}`;
			console.log(`🌐 Base URL extracted from request: ${baseUrl}`);
			return baseUrl;
		} catch (e) {
			console.error('⚠️  Error extracting base URL from request:', e);
			return 'http://localhost:8080';
		}
	}


	// Client emits: socket.emit('start', { chatId, modelId, userMessageId, noThinking })
	async start(data, socket /*, io */) {
	
		try {
			// Resolve contexts/services from master singletons to ensure availability in socket scope
			const chatContext = (master.requestList && master.requestList.chatContext) ? master.requestList.chatContext : null;
			const reqContainer = master.requestList || {};
			const httpRequest = reqContainer.request || null;
			const userContext = reqContainer.userContext || null;
			const authService = (reqContainer.authService) ? reqContainer.authService : (httpRequest && httpRequest.authService) ? httpRequest.authService : null;

			const currentUser = (authService && httpRequest && userContext) ? authService.currentUser(httpRequest, userContext) : null;
			this._currentUser = currentUser;

			if (!currentUser || currentUser.error) {
				this.streamingService.sendEvent(socket, errorService.buildStreamErrorPayload(new Error('Unauthorized: no valid session')));
				this.streamingService.endStream(socket);
				return;
			}

			// Basic params
			const formData = data || {};
			let { chatId, modelId, userMessageId } = formData;
			const noThinking = !!formData.noThinking;

			if (!modelId || !userMessageId) {
				this.streamingService.sendEvent(socket, errorService.buildStreamErrorPayload(new Error('Missing required fields: modelId, userMessageId')));
				this.streamingService.endStream(socket);
				return;
			}

			// Load model config (OpenAI-compatible only)
			const modelResult = await llmConfigService.getModelConfig(modelId);
			this.modelConfig = modelResult;
			this.modelSettings = this.modelConfig.settings || {};

			// Workspace-aware overrides: prompt template, system prompt, and settings via workspace Profile/Overrides
			// IMPORTANT: Declare workspaceId at function scope so RAG query can access it later
			let workspaceId = null;
			try {
				// Attempt to detect if chat is workspace-created and load its workspace
				let isWorkspaceCreated = false;
				try {
					const chatIdNum = parseInt(chatId, 10) || 0;
					const chatEntity = chatContext?.Chat?.where?.(r => r.id == $$, chatIdNum)?.single();
					// Check if chat is workspace-created using the created_by field
					isWorkspaceCreated = !!(chatEntity && chatEntity.created_by === 'Workspace');
				} catch (_) {}
				console.log(`🔍 Workspace Detection: Chat ${chatId} - isWorkspaceCreated = ${isWorkspaceCreated}`);
				if (isWorkspaceCreated) {
					// Access workspace context from master singleton
					
					const workspaceContext = master.requestList.workspaceContext;
					if (!workspaceContext) {
						console.warn(`⚠️  Workspace context singleton not found`);
					} else {
						try {
							const chatIdNum = parseInt(chatId, 10) || 0;
							const link = workspaceContext.WorkspaceChat.where(r => r.chat_id == $$, chatIdNum).toList()[0];
							workspaceId = link ? link.workspace_id : null;
							console.log(`✅ Found workspace link: workspaceId = ${workspaceId}`);
						} catch (err) {
							console.warn(`⚠️  Failed to query workspace link:`, err.message);
							workspaceId = null;
						}
					}

				}
			} catch (_) { /* non-fatal */ }

			// Persistence
			const persistenceService = new MessagePersistenceService(chatContext, currentUser);

			// Derive chatId from userMessageId if not provided
			if (!chatId) {
				try {
					const userMsg = await persistenceService.getMessageById(userMessageId);
					if (!userMsg) {
						this.streamingService.sendEvent(socket, errorService.buildStreamErrorPayload(new Error('User message not found'), this.modelConfig?.name));
						this.streamingService.endStream(socket);
						return;
					}
					chatId = userMsg.chat_id;
				} catch (e) {
					this.streamingService.sendEvent(socket, errorService.buildStreamErrorPayload(new Error('Failed to resolve chat from message')), this.modelConfig?.name);
					this.streamingService.endStream(socket);
					return;
				}
			}
			const { aiMessage, aiMessageId, generationStartTime } = await persistenceService.createAssistantMessageOnStreamStart(chatId, this.modelConfig, this.modelSettings);

			// Notify client connected + ids
			this.streamingService.sendEvent(socket, {
				type: 'connected',
				message: 'AI streaming started',
				model: this.modelConfig?.name || 'Unknown',
				aiMessageId: aiMessageId,
				temp_user_id: (currentUser && currentUser.isTemp) ? currentUser.id : null
			});

			// Extract base URL from request for image URLs
			const baseUrl = this._getBaseUrlFromRequest(httpRequest);

			// Prepare services
			const chatHistoryService = new ChatHistoryService(chatContext, this.modelSettings);

			let messageHistory;
			try {
				messageHistory = await chatHistoryService.loadChatHistory(chatId, baseUrl);
				console.log(`✅ Chat history loaded successfully, ${messageHistory?.length || 0} messages`);
			} catch (e) {
				console.error(`❌ Failed to load chat history:`, e);
				this.streamingService.sendEvent(socket, errorService.buildStreamErrorPayload(new Error('Failed to load chat history'), this.modelConfig?.name));
				this.streamingService.endStream(socket);
				return;
			}

			// Apply server-side auto-trim if enabled and model defines a real context_size
		try {
			const hasContextRule = Number(this.modelConfig?.context_size || 0) > 0;
			const dbAutoTrim = !!(this.modelConfig && this.modelConfig.auto_trim_on);
			const shouldTrim = dbAutoTrim && hasContextRule;
			if (shouldTrim) {
				try {
					messageHistory = await chatHistoryService.manageContextWindow(messageHistory);
				} catch (_) {}
			}
		} catch (_) {}

		// 🔌 HOOKS: Apply LLM_BEFORE_GENERATE filter to allow plugins to modify message history
		// This is where plugins (like RAG) can inject context, modify prompts, etc.
		try {
			console.log(`🔌 Applying LLM_BEFORE_GENERATE filter hook...`);
			const hookResult = await hookService.applyFilters(HOOKS.LLM_BEFORE_GENERATE, {
				messageHistory,
				chatId,
				workspaceId,
				modelConfig: this.modelConfig,
				modelSettings: this.modelSettings,
				userMessageId,
				baseUrl,
				chatContext,
				currentUser
			});

			// Extract modified messageHistory from hook result
			if (hookResult && hookResult.messageHistory) {
				messageHistory = hookResult.messageHistory;
				console.log(`✅ LLM_BEFORE_GENERATE hook applied successfully`);
			}
		} catch (hookErr) {
			console.error('⚠️  LLM_BEFORE_GENERATE hook failed (non-fatal):', hookErr);
		}

		// 🔍 DEBUG: Log final message history
		console.log(`📨 FINAL MESSAGE HISTORY BEFORE GENERATE (${messageHistory.length} messages):`);
		messageHistory.forEach((msg, idx) => {
			const preview = (msg.content || '').substring(0, 150).replace(/\n/g, ' ');
			console.log(`  [${idx}] ${msg.role}: ${preview}...`);
		});

			// Thinking detection service
			const ThinkingDetectionService = require(`${master.root}/components/chats/app/service/thinkingDetectionService`);
			const thinkingService = new ThinkingDetectionService(persistenceService, this.modelConfig.id, generationStartTime, aiMessageId);
			thinkingService.loadRules();

			// Register stream for interrupts
			const streamId = `socket-stream-${aiMessageId}-${Date.now()}`;
			this.streamingService.registerStream(streamId, socket, async () => {
				// Handle client-side interrupt if needed in future
			});

			// Listen for explicit cancel from client on this socket
			const cancelHandler = async () => {
				try { this.streamingService.cleanupStream(streamId); } catch (_) {}
			};
			try { socket.on('chat:cancel', cancelHandler); } catch (_) {}

			// Generate streaming response
			let lastDisplayBuffer = '';
			let lastThinkingBufferSent = '';
			let lastThinkingEndTime = null;
			let lastTokenCount = 0;
			let generationResult;
			try {
				const tokenCallback = async (chunk) => {
					try {
						// Process chunk through thinking detection first to derive clean display buffer
						if (typeof chunk === 'string' && chunk.length > 0) {
							let result = null;
							try { result = await thinkingService.processChunk(chunk); } catch (_) { result = null; }
							const displayBuffer = (result && typeof result.responseBuffer === 'string') ? result.responseBuffer : (lastDisplayBuffer || '');
							const thinkingBuffer = (result && typeof result.thinkingBuffer === 'string') ? result.thinkingBuffer : '';
							const thinkingStartTime = (result && typeof result.thinkingStartTime !== 'undefined') ? result.thinkingStartTime : null;
							const thinkingEndTime = (result && typeof result.thinkingEndTime !== 'undefined') ? result.thinkingEndTime : null;

							// Compute thinking delta relative to last sent buffer
							let thinkingDelta = '';
							if (thinkingBuffer) {
								if (thinkingBuffer.startsWith(lastThinkingBufferSent)) {
									thinkingDelta = thinkingBuffer.slice(lastThinkingBufferSent.length);
								} else {
									// Reset or divergence; send full current buffer as a new segment
									thinkingDelta = thinkingBuffer;
								}
								lastThinkingBufferSent = thinkingBuffer;
							}

							const elapsedSec = Math.max(0.001, (Date.now() - generationStartTime) / 1000);
							const tokenCount = Math.ceil(displayBuffer.length / 4);
							const tps = tokenCount > 0 ? +(tokenCount / elapsedSec).toFixed(2) : null;

							// Emit enriched aiChunk with clean fullText and thinking extras
							const extraFields = { responseBuffer: displayBuffer };
							if (thinkingBuffer) extraFields.thinkingBuffer = thinkingBuffer;
							if (thinkingDelta) extraFields.thinkingDelta = thinkingDelta;
							if (thinkingStartTime !== null) extraFields.thinkingStartTime = thinkingStartTime;
							if (thinkingEndTime !== null && thinkingEndTime !== lastThinkingEndTime) {
								extraFields.thinkingEndTime = thinkingEndTime;
								lastThinkingEndTime = thinkingEndTime;
							}
							this.streamingService.sendAIChunk(
								socket,
								chunk,
								aiMessageId,
								displayBuffer,
								tps,
								tokenCount,
								extraFields
							);

							// Persist incremental CLEAN assistant content (non-thinking only)
							try {
								await persistenceService.saveIncrementalAssistantContent(
									aiMessageId,
									displayBuffer,
									tokenCount,
									tps,
									thinkingService.getDetectedSectionsCount ? thinkingService.getDetectedSectionsCount() : 0,
									generationStartTime,
									lastTokenCount
								);
								lastTokenCount = tokenCount;
								lastDisplayBuffer = displayBuffer;
							} catch (_) {}
						}
					} catch (_) {}
				};

				// 🔧 CRITICAL FIX: Remove the current AI placeholder message from history
				// The createAssistantMessageOnStreamStart() creates a placeholder with "-" content
				// which confuses the LLM if included in the message history
				messageHistory = messageHistory.filter(msg => {
					// Keep all non-assistant messages
					if (msg.role !== 'assistant') return true;
					// Keep assistant messages that have real content (not just the placeholder)
					return msg.content && msg.content.trim() && msg.content.trim() !== '-';
				});

				// 📨 DEBUG: Log the final message history being sent to the LLM (only in development)
				const DEBUG_MESSAGE_HISTORY = process.env.DEBUG_MESSAGE_HISTORY === 'true';
				if (DEBUG_MESSAGE_HISTORY) {
					console.log("📨 FINAL MESSAGE HISTORY SENT TO LLM (after filtering placeholder):");
					console.log(JSON.stringify(messageHistory, null, 2));
				}

				generationResult = await this.modelService._generate(
					messageHistory,
					tokenCallback,
					noThinking,
					this.modelConfig
				);
			} catch (genErr) {
				// Normalize and surface provider error details to client
				try {
					const payload = errorService.buildStreamErrorPayload(genErr, this.modelConfig?.name);
					this.streamingService.sendEvent(socket, payload);
				} catch (_) {}
				try { if (typeof persistenceService.updateMessageStatus === 'function') { await persistenceService.updateMessageStatus(aiMessageId, 'failed', { error: genErr.message }); } } catch (_) {}
				// Optionally remove empty assistant message from DB so UI stays clean on refresh
				try { await persistenceService.deleteAssistantMessageIfEmpty(aiMessageId); } catch (_) {}
				this.streamingService.endStream(socket);
				this.streamingService.cleanupStream(streamId);
				return;
			}

			// 🖼️ AI Image Processing: Detect, download, and save AI-generated images
			const savedImageUrls = [];
			try {
				const responseNormalizationService = new ResponseNormalizationService();
				const mediaService = new MediaService();
				const mediaContext = (master.requestList && master.requestList.mediaContext) ? master.requestList.mediaContext : null;

				// Get vendor from model config
				const vendor = this.modelConfig?.vendor || 'unknown';
				const modelName = this.modelConfig?.name || 'unknown';

				console.log(`\n🖼️ AI Image Detection: Checking response for images (vendor: ${vendor})...`);

				// Normalize the LLM response to detect images
				const normalized = responseNormalizationService.normalize(lastDisplayBuffer, vendor, modelName);

				// Check if response contains images
				if (responseNormalizationService.hasImages(normalized)) {
					const imageUrls = responseNormalizationService.getImageUrls(normalized);
					console.log(`✅ Found ${imageUrls.length} AI-generated image(s)`);

					// Download and save each image
					for (const imageUrl of imageUrls) {
						try {
							console.log(`📥 Downloading AI image: ${imageUrl}`);

							const savedImage = await mediaService.saveAIGeneratedImage(imageUrl, {
								messageId: aiMessageId,
								chatId: chatId,
								mediaContext: mediaContext,
								source: 'ai',
								vendor: vendor
							});

							savedImageUrls.push(savedImage.url);
							console.log(`✅ Saved AI image: ${savedImage.url}`);

							// Send image event to frontend
							this.streamingService.sendEvent(socket, {
								type: 'aiImage',
								messageId: aiMessageId,
								imageUrl: savedImage.url,
								originalUrl: imageUrl,
								fileId: savedImage.fileId
							});
						} catch (imageError) {
							console.error(`❌ Failed to save AI image ${imageUrl}:`, imageError);
						}
					}

					// Update assistant message with image attachments
					if (savedImageUrls.length > 0) {
						try {
							await persistenceService.updateMessageAttachments(aiMessageId, savedImageUrls);
							console.log(`✅ Updated message ${aiMessageId} with ${savedImageUrls.length} image attachment(s)`);
						} catch (attachError) {
							console.error(`❌ Failed to update message attachments:`, attachError);
						}
					}

					// Get clean text content without image URLs
					const cleanText = responseNormalizationService.getTextContent(normalized);
					if (cleanText !== lastDisplayBuffer) {
						// Update lastDisplayBuffer to clean text (without image markdown/URLs)
						lastDisplayBuffer = cleanText;
						console.log(`🧹 Cleaned text content (removed image URLs)`);
					}
				} else {
					console.log(`ℹ️  No AI-generated images detected in response`);
				}
			} catch (imageProcessingError) {
				console.error(`⚠️  AI image processing failed (non-fatal):`, imageProcessingError);
			}

			// Finalize: persist trailing update, send final clean chunk, completion event, and close stream
			try {
				// Ensure DB reflects the final full CLEAN response before completion
				try {
					const finalDisplay = String(lastDisplayBuffer || '');
					const finalElapsedSec = Math.max(0.001, (Date.now() - generationStartTime) / 1000);
					const finalTokens = Math.ceil(finalDisplay.length / 4);
					const finalTps = finalTokens > 0 ? +(finalTokens / finalElapsedSec).toFixed(2) : null;
					await persistenceService.saveIncrementalAssistantContent(
						aiMessageId,
						finalDisplay,
						finalTokens,
						finalTps,
						0,
						generationStartTime,
						0
					);
				} catch (_) {}

				// Emit a final aiChunk carrying the final CLEAN fullText for UI sync
				try {
					this.streamingService.sendAIChunk(
						socket,
						'__STREAM_END__',
						aiMessageId,
						String(lastDisplayBuffer || ''),
						null,
						null,
						{ responseBuffer: String(lastDisplayBuffer || '') }
					);
				} catch (_) {}
				try { if (typeof persistenceService.flushPendingStreamingUpdate === 'function') { await persistenceService.flushPendingStreamingUpdate(aiMessageId); } } catch (_) {}
				try { if (typeof persistenceService.updateMessageStatus === 'function') { await persistenceService.updateMessageStatus(aiMessageId, 'completed', { finishedAt: Date.now() }); } } catch (_) {}
				let finalAiMessage = null;
				try { finalAiMessage = await persistenceService.getMessageById(aiMessageId); } catch (_) {}
				if (finalAiMessage) {
					this.streamingService.sendAIMessageComplete(socket, finalAiMessage, this.modelConfig?.name);
				}
				this.streamingService.endStream(socket);
			} catch (finalErr) {
				try {
					const payload = errorService.buildStreamErrorPayload(finalErr, this.modelConfig?.name);
					this.streamingService.sendEvent(socket, payload);
				} catch (_) {}
				this.streamingService.endStream(socket);
			} finally {
				try { socket.off && socket.off('chat:cancel', cancelHandler); } catch (_) {}
				this.streamingService.cleanupStream(streamId);
			}
		} catch (e) {
			try {
				const payload = errorService.buildStreamErrorPayload(e, this?.modelConfig?.name);
				this.streamingService.sendEvent(socket, payload);
			} catch (_) {}
		}
	}
}

module.exports = chatSocket;


