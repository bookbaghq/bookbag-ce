const master = require('mastercontroller');
const StreamingService = require(`${master.root}/components/chats/app/service/streamingService`);
const MessagePersistenceService = require(`${master.root}/components/chats/app/service/messagePersistenceService`);
const ChatHistoryService = require(`${master.root}/components/chats/app/service/chatHistoryService`);
const ModelService = require(`${master.root}/components/chats/app/service/modelService`);
const llmConfigService = require("../../components/models/app/service/llmConfigService");
const errorService = require(`${master.root}/app/service/errorService`);

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
			let responseBuffer = '';
			let lastTokenCount = 0;
			let generationResult;
			try {
				const tokenCallback = async (chunk) => {
					try {
						// Accumulate full text and compute simple stats
						if (typeof chunk === 'string' && chunk.length > 0) {
							responseBuffer += chunk;
							const elapsedSec = Math.max(0.001, (Date.now() - generationStartTime) / 1000);
							const tokenCount = Math.ceil(responseBuffer.length / 4);
							const tps = tokenCount > 0 ? +(tokenCount / elapsedSec).toFixed(2) : null;

							// Emit enriched aiChunk event expected by frontend
							this.streamingService.sendAIChunk(
								socket,
								chunk,
								aiMessageId,
								responseBuffer,
								tps,
								tokenCount,
								null
							);

							// Persist incremental clean content (hybrid throttle/debounce inside service)
							try {
								await persistenceService.saveIncrementalAssistantContent(
									aiMessageId,
									responseBuffer,
									tokenCount,
									tps,
									thinkingService.getDetectedSectionsCount ? thinkingService.getDetectedSectionsCount() : 0,
									generationStartTime,
									lastTokenCount
								);
								lastTokenCount = tokenCount;
							} catch (_) {}

							// Forward chunk to thinking detection service
							try { await thinkingService.processChunk(chunk); } catch (_) {}
						}
					} catch (_) {}
				};

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

            // Finalize: persist trailing update, send completion event, and close stream
			try {
                // Ensure DB reflects the final full response before completion
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


