const master = require('mastercontroller');
const StreamingService = require(`${master.root}/components/chats/app/service/streamingService`);
const MessagePersistenceService = require(`${master.root}/components/chats/app/service/messagePersistenceService`);
const ChatHistoryService = require(`${master.root}/components/chats/app/service/chatHistoryService`);
const ModelService = require(`${master.root}/components/chats/app/service/modelService`);
const llmConfigService = require("../../components/models/app/service/llmConfigService");
const errorService = require(`${master.root}/app/service/errorService`);

// RAG imports - load once at module level for efficiency
const RAGContext = require(`${master.root}/components/rag/app/models/ragContext`);
const RAGService = require(`${master.root}/components/rag/app/service/ragService`);

class chatSocket {

	constructor(dependencies) {
		// Dependency injection with sensible defaults
		const deps = dependencies || {};
		this.modelService = deps.modelService || ModelService.getInstance();
		this.streamingService = deps.streamingService || StreamingService.getInstance();
	}

	// Client emits: socket.emit('start', { chatId, modelId, userMessageId, noThinking })
	async start(data, socket /*, io */) {
		// High-level flow: auth -> params -> model -> history -> placeholder -> stream -> persist -> finalize
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
			try {
				// Attempt to detect if chat is workspace-created and load its workspace
				let isWorkspaceCreated = false;
				let workspaceId = null;
				try {
					const chatEntity = chatContext.Chat.where(r => r.id == $$, chatId || 0).single();
					isWorkspaceCreated = !!(chatEntity && (chatEntity.is_workplace_created === true || chatEntity.is_workplace_created === 1));
				} catch (_) {}
				if (isWorkspaceCreated) {
					let workspaceContext = null;
					try { workspaceContext = (master.requestList && master.requestList.workspaceContext) ? master.requestList.workspaceContext : null; } catch (_) { workspaceContext = null; }
					if (workspaceContext) {
						try {
							const link = workspaceContext.WorkspaceChat.where(r => r.chat_id == $$, chatId).toList()[0];
							workspaceId = link ? link.workspace_id : null;
						} catch (_) { workspaceId = null; }
					}
					if (workspaceId) {
						try {
							const ws = workspaceContext.Workspace.where(r => r.id == $$, workspaceId).single();
							// 1) prompt_template override (if provided on workspace)
							const wsPromptTemplate = (typeof ws?.prompt_template === 'string' && ws.prompt_template.trim().length > 0)
								? ws.prompt_template.trim()
								: null;
							// 2) system_prompt override (if provided on workspace)
							const wsSystemPrompt = (typeof ws?.system_prompt === 'string' && ws.system_prompt.trim().length > 0)
								? ws.system_prompt.trim()
								: null;

							// 3) Build settings from workspace Profile + ModelOverrides(workspace)
							const modelCtxFactory = require(`${master.root}/components/models/app/models/modelContext`);
							const mctx = new modelCtxFactory();
							// Resolve workspace profile and rules
							let rules = [];
							try {
								const profileId = ws.profile_id || ws.Profile?.id;
								if (profileId) {
									const prof = mctx.Profiles.where(r => r.id == $$, profileId).single();
									const pr = prof?.ProfileFieldRules;
									rules = pr?.toList ? pr.toList() : (Array.isArray(pr) ? pr : (pr ? [pr] : []));
								}
							} catch (_) { rules = []; }
							const defaults = {}; const ruleMeta = {};
							for (const r of rules) {
								if (!r || !r.name) continue;
								defaults[r.name] = r.default_value;
								ruleMeta[r.name] = { field_type: (r.field_type || '').toString().toLowerCase(), range: (r.range || '').toString() };
							}
							// Workspace-specific overrides
							let overrides = [];
							try {
								const raw = mctx.ModelOverrides.where(o => o.workspace_id == $$, workspaceId).toList();
								overrides = Array.isArray(raw) ? raw : (raw ? [raw] : []);
							} catch (_) { overrides = []; }
							const effective = { ...defaults };
							for (const ov of overrides) {
								try {
									for (const ru of rules) {
										if (ru.id === ov.profile_field_rule_id) {
											const key = ru.name;
											if (key === 'stop_strings') {
												effective['stop_strings'] = ov.StopStrings || ov.stop_strings || ov.stop || [];
											} else if (typeof ov.value !== 'undefined' && ov.value !== null) {
												effective[key] = ov.value;
											}
										}
									}
								} catch (_) {}
							// Coercion copied from llmConfigService
							const coerceByType = (type, value, rangeStr) => {
								const t = (type || '').toLowerCase();
								if (value === null || typeof value === 'undefined') return undefined;
								if (t === 'integer' || t === 'int') { const n = parseInt(value, 10); return Number.isFinite(n) ? n : undefined; }
								if (t === 'float' || t === 'number' || t === 'range') { const n = parseFloat(value); return Number.isFinite(n) ? n : undefined; }
								if (t === 'boolean' || t === 'bool') {
									if (typeof value === 'boolean') return value;
									const s = String(value).trim().toLowerCase();
									if (s === 'true' || s === '1' || s === 'yes' || s === 'y') return true;
									if (s === 'false' || s === '0' || s === 'no' || s === 'n') return false;
									return undefined;
								}
								if (t === 'json') {
									if (typeof value === 'object') return value;
									if (typeof value === 'string') { try { return JSON.parse(value); } catch (_) { return undefined; } }
									return undefined;
								}
								return String(value);
							};
							const wsSettings = {};
							for (const key of Object.keys(effective)) {
								const meta = ruleMeta[key] || { field_type: 'string', range: '' };
								const coerced = coerceByType(meta.field_type, effective[key], meta.range);
								if (typeof coerced !== 'undefined') wsSettings[key] = coerced;
							}

							// Apply workspace overrides to modelConfig/settings
							this.modelConfig = {
								...this.modelConfig,
								prompt_template: wsPromptTemplate || this.modelConfig.prompt_template,
								system_prompt: wsSystemPrompt || this.modelConfig.system_prompt,
								settings: Object.keys(wsSettings).length > 0 ? wsSettings : (this.modelConfig.settings || {})
							};
							this.modelSettings = this.modelConfig.settings || {};
						}
						} catch (e) {
							console.error('⚠️ Workspace overrides failed:', e?.message);
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

			// Prepare services
			const chatHistoryService = new ChatHistoryService(chatContext, this.modelSettings);

			let messageHistory;
			try {
				messageHistory = await chatHistoryService.loadChatHistory(chatId);
			} catch (e) {
				this.streamingService.sendEvent(socket, errorService.buildStreamErrorPayload(new Error('Failed to load chat history'), this.modelConfig?.name));
				this.streamingService.endStream(socket);
				return;
			}

			// 🧠 RAG Integration: Query knowledge base before calling LLM
			let ragContext = '';
			let ragQueryText = ''; // Store the original query text for later use
			try {
				// Initialize RAG service (using module-level imports for efficiency)
				const ragCtx = new RAGContext();
				const ragService = new RAGService(ragCtx);

				// Get the user's last message to use as the query (reverse find is faster for long histories)
				const lastUserMessage = [...messageHistory].reverse().find(m => m.role === 'user');
				if (lastUserMessage && lastUserMessage.content) {
					ragQueryText = lastUserMessage.content; // Save the query text
					console.log(`🔍 RAG: Querying knowledge base for chat ${chatId}...`);
					console.log(`🔍 RAG: Query text: "${ragQueryText}"`);

					// Query the knowledge base (top 5 most relevant chunks)
					const results = await ragService.queryRAG(parseInt(chatId, 10), ragQueryText, 5);

					if (results && results.length > 0) {
						console.log(`✅ RAG: Found ${results.length} relevant chunks (top score: ${results[0].score.toFixed(4)})`);

						// Build context string from retrieved documents
						ragContext = ragService.buildContextString(results);

						console.log(`📚 RAG: Context length: ${ragContext.length} characters`);
					} else {
						console.log(`ℹ️  RAG: No relevant documents found for this query`);
					}
				}
			} catch (ragErr) {
				// Non-fatal: if RAG fails, continue without it
				console.warn('⚠️  RAG query failed (non-fatal):', ragErr.message);
			}

			// Inject RAG context with STRONG grounding instructions if available
			if (ragContext) {
				// ✅ FIX 1: Strengthen system instruction with mandatory language
				const existingSystemPrompt = this.modelConfig.system_prompt || '';
				const systemPromptWithContext = `${existingSystemPrompt}

--- Retrieved Knowledge Base Context ---
${ragContext}
--- End of Retrieved Context ---

**CRITICAL INSTRUCTIONS:**
You MUST answer the user's question **only** using the information contained between the "Retrieved Knowledge Base Context" markers above.
- If the answer is present there, return it directly and concisely.
- If it is NOT present, reply EXACTLY: "I don't know based on the provided documents."
- Do NOT answer from your own knowledge or speculate beyond the retrieved context.
- Do NOT ask clarifying questions.
- Respond directly based ONLY on the retrieved context.`;

				// Inject or update system message in history
				const systemMsgIndex = messageHistory.findIndex(m => m.role === 'system');
				if (systemMsgIndex >= 0) {
					// Append to existing system message rather than replacing it
					messageHistory[systemMsgIndex].content = systemPromptWithContext;
				} else {
					// Prepend system message with RAG context
					messageHistory.unshift({ role: 'system', content: systemPromptWithContext });
				}

				// ✅ FIX 2 & 3: Inject retrieved context directly into the user message for stronger grounding
				// Use bulletproof injection that safely finds and modifies the last user message
				const lastUserMsg = [...messageHistory].reverse().find(m => m.role === 'user');

				if (lastUserMsg && typeof lastUserMsg.content === 'string' && lastUserMsg.content.trim()) {
					// Create strongly grounded user message with context + mandatory instructions
					// Fallback to original content if ragQueryText is missing
					const userQuestion = ragQueryText || lastUserMsg.content;

					const groundedUserMessage = `Context from Knowledge Base:

${ragContext || '[NO CONTEXT FOUND]'}

Instructions: Answer the following question ONLY using the context provided above. If the answer is not in the context, reply: "I don't know based on the provided documents."

Question: ${userQuestion}`;

					lastUserMsg.content = groundedUserMessage;
					console.log(`✅ RAG: Context injected into both system prompt AND user message for maximum grounding`);
					console.log(`✅ RAG: Final grounded user message (first 300 chars):`, groundedUserMessage.slice(0, 300) + "...");
				} else {
					console.warn(`⚠️  No valid user message found. Skipping user message injection.`);
					console.log(`✅ RAG: Context injected into system prompt only (${ragContext.split('\n').length} lines)`);
				}
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

				// 📨 DEBUG: Log the final message history being sent to the LLM
				console.log("📨 FINAL MESSAGE HISTORY SENT TO LLM (after filtering placeholder):");
				console.log(JSON.stringify(messageHistory, null, 2));

				generationResult = await this.modelService._generateViaOpenAICompatible(
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


