/**
 * Context Management Service for Chat Interface
 * Handles context size calculation, model limits, and auto-trimming
 */
import api from "../../../../apiConfig.json";
const BASE = api.ApiConfig.main;

/**
 * Context Service class to manage chat context and model limits
 */
export class ContextService {
  constructor() {
    this.contextInfo = null;
    this.contextLoading = false;
    this.contextError = null;
  }

  /**
   * Fetch real-time context size from backend
   * @param {string} currentChatId - Current chat ID
   * @param {string} inputValue - Current input text
   * @param {string} selectedModelId - Selected model ID
   * @returns {Promise<object>} - Context information
   */
  async fetchContextSize(currentChatId, inputValue, selectedModelId) {
    if (!selectedModelId) {
      throw new Error('Model ID is required to fetch context size');
    }

    this.contextLoading = true;
    this.contextError = null;

    try {
      const response = await fetch(`${BASE}/${api.ApiConfig.message.getContextSize.url}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          chatId: currentChatId,
          currentInput: inputValue,
          modelId: selectedModelId
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && !data.notSupported) {
          this.contextInfo = data.contextInfo;
          this.contextError = null;
          return data.contextInfo;
        } else if (data.success && data.notSupported) {
          // Model does not define context_size; disable feature
          this.contextInfo = null;
          this.contextError = null;
          return null;
        } else {
        console.error('❌ Failed to fetch context size:', data.error);
          this.contextError = data.error;
          throw new Error(data.error);
        }
      } else {
        console.error('❌ Context size request failed:', response.status);
        this.contextError = 'Failed to fetch context size';
        throw new Error('Failed to fetch context size');
      }
    } catch (error) {
      console.error('❌ Error fetching context size:', error);
      this.contextError = 'Error fetching context size';
      throw error;
    } finally {
      this.contextLoading = false;
    }
  }

  /**
   * Get current context information
   * @returns {object|null} - Current context info
   */
  getContextInfo() {
    return this.contextInfo;
  }

  /**
   * Check if context is loading
   * @returns {boolean} - True if loading
   */
  isLoading() {
    return this.contextLoading;
  }

  /**
   * Get context error
   * @returns {string|null} - Error message if any
   */
  getError() {
    return this.contextError;
  }

  /**
   * Clear context information
   */
  clearContext() {
    this.contextInfo = null;
    this.contextError = null;
    this.contextLoading = false;
  }

  /**
   * Check if context would exceed limits
   * @returns {boolean} - True if would exceed limits
   */
  wouldExceedLimit() {
    return this.contextInfo?.wouldExceedLimit || false;
  }

  /**
   * Get utilization percentage
   * @returns {number} - Context utilization percentage
   */
  getUtilizationPercentage() {
    return this.contextInfo?.utilizationPercentage || 0;
  }
}

/**
 * Model Service class to manage available models and limits
 */
export class ModelService {
  constructor() {
    this.availableModels = [];
    this.modelsLoading = true;
    this.selectedModelId = '';
    this.currentModel = null;
    this.modelLimits = null;
  }

  /**
   * Fetch available models from backend
   * @returns {Promise<array>} - Array of available models
   */
  async fetchAvailableModels() {
    try {
      this.modelsLoading = true;
      const backendUrl = BASE;

      // If chat is workspace-created, fetch allowed model IDs and filter; else return full list
      let allowedModelIds = null;
      try {
        const chatIdCandidate = this.currentChatId || null;
        if (chatIdCandidate && this.currentChatIsWorkspace) {
          const url = new URL(`${backendUrl}/bb-workspace/api/chat/allowed-models`);
          url.searchParams.set('chatId', String(chatIdCandidate));
          const allowRes = await fetch(url.toString(), { credentials: 'include' });
          if (allowRes.ok) {
            const allowData = await allowRes.json();
            if (allowData?.success && Array.isArray(allowData.models) && allowData.models.length > 0) {
              allowedModelIds = new Set(allowData.models.map(String));
            }
          }
        }
      } catch (_) { /* non-fatal */ }

      // Use DB-backed published models list (bb-models namespace)
      const response = await fetch(`${backendUrl}/bb-models/api/models/published`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          // Likely an auth redirect (HTML). Handle gracefully without throwing.
          console.warn('Unexpected response type when fetching models:', contentType, response.url);
          this.availableModels = [];
          return [];
        }
        const data = await response.json();
        
        if (data.success && Array.isArray(data.models)) {
          // Map to structure expected by UI; include label "name (type)"
          let models = data.models.map(m => ({
            id: String(m.id),
            name: m.label || (m.type ? `${m.name} (${m.type})` : m.name),
            rawName: m.name,
            type: m.type
          }));
          if (allowedModelIds) {
            models = models.filter(m => allowedModelIds.has(String(m.id)));
          }

          // ✨ Add "Auto" option at the top of the list
          const autoOption = {
            id: 'auto',
            name: '🤖 Auto (Smart Selection)',
            rawName: 'Auto',
            type: 'auto'
          };
          this.availableModels = [autoOption, ...models];

          // Set "Auto" as selected by default
          if (this.availableModels.length > 0 && !this.selectedModelId) {
            this.setSelectedModel('auto');
          }

          return this.availableModels;
        } else {
          this.availableModels = [];
          return [];
        }
      } else {
        throw new Error(`Failed to fetch available models: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch available models:', error);
      this.availableModels = [];
      return [];
    } finally {
      this.modelsLoading = false;
    }
  }

  /**
   * Set selected model by ID
   * @param {string} modelId - Model ID to select
   * @returns {object|null} - Selected model object
   */
  setSelectedModel(modelId) {
    const selectedModel = this.availableModels.find(model => model.id === modelId);
    if (selectedModel) {
      this.selectedModelId = modelId;
      this.currentModel = selectedModel;

      // Handle "auto" model selection differently
      if (modelId === 'auto') {
        // For auto, we don't have specific limits yet
        // The backend will select the actual model
        this.modelLimits = {
          maxTokens: null, // Will be determined by auto-selected model
          contextSize: 0, // Will be determined by auto-selected model
          modelName: selectedModel.name,
          modelId: 'auto'
        };
        return selectedModel;
      }

      // Respect per-profile rules: if context_size is missing or 0, do not set a cap
      // Context size is provided at top-level model field now (not in settings unless explicit rule exists)
      const rawContextSize = selectedModel.context_size ?? selectedModel.settings?.contextSize;
      const normalizedContext = (typeof rawContextSize === 'number' && rawContextSize > 0) ? rawContextSize : 0;
      const rawMaxTokens = selectedModel.settings?.max_tokens ?? selectedModel.settings?.maxTokens;
      const normalizedMaxTokens = (typeof rawMaxTokens === 'number' && rawMaxTokens > 0) ? rawMaxTokens : null;
      this.modelLimits = {
        maxTokens: normalizedMaxTokens, // may be null (no cap)
        contextSize: normalizedContext, // 0 indicates no cap/profile rule missing
        modelName: selectedModel.name,
        modelId: selectedModel.id
      };
      return selectedModel;
    }
    return null;
  }

  /**
   * Get available models
   * @returns {array} - Array of available models
   */
  getAvailableModels() {
    return this.availableModels;
  }

  /**
   * Get selected model ID
   * @returns {string} - Selected model ID
   */
  getSelectedModelId() {
    return this.selectedModelId;
  }

  /**
   * Get current model
   * @returns {object|null} - Current model object
   */
  getCurrentModel() {
    return this.currentModel;
  }

  /**
   * Get model limits
   * @returns {object|null} - Model limits object
   */
  getModelLimits() {
    return this.modelLimits;
  }

  /**
   * Check if models are loading
   * @returns {boolean} - True if loading
   */
  isLoading() {
    return this.modelsLoading;
  }

  /**
   * Check if current model supports no thinking mode
   * @returns {boolean} - True if supports no thinking
   */
  supportsNoThinking() {
    return this.currentModel?.supportsNoThinking || 
           !!this.currentModel?.settings?.system_prompt_force_no_thinking;
  }
}

// Create singleton instances
export const contextService = new ContextService();
export const modelService = new ModelService();
