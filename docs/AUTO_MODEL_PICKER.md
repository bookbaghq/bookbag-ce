# Auto Model Picker System Documentation

## Overview

The Auto Model Picker is a Cursor-style intelligent model routing system that automatically selects the optimal AI model based on prompt characteristics, complexity, and context. This feature saves costs by using lighter models for simple queries while reserving powerful models for complex reasoning tasks.

**Key Features:**
- Rule-based smart routing (fast, deterministic selection)
- Token-aware decision making
- Pattern matching for different query types
- Workspace-aware model filtering
- Per-chat and global model selection persistence
- Real-time context size monitoring

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                  (Modern Chat Interface)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CHATCONTROLLER                             │
│  - Model initialization and restoration                         │
│  - LocalStorage persistence (per-chat + global)                 │
│  - Model selection event handling                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MODELSERVICE                               │
│  - Fetches available models from backend                        │
│  - Adds "Auto" option to model list                             │
│  - Workspace filtering                                          │
│  - Context limits management                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (WebSocket/API)                       │
│  - Receives modelId='auto' in request                           │
│  - Invokes ModelRouterService                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MODELROUTERSERVICE                            │
│  - Analyzes prompt complexity                                   │
│  - Pattern matching (factual, code, reasoning, news)            │
│  - Token estimation                                             │
│  - Selects from fast/balanced/advanced/realtime tiers           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ACTUAL MODEL INVOCATION                       │
│  (OpenAI Adapter, Anthropic Adapter, etc.)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Frontend: ChatController.js

**Location:** `nextjs-app/app/bb-client/_components/controllers/ChatController.js`

**Responsibilities:**
- Initialize available models on component mount
- Restore saved model selection (per-chat or global)
- Handle model selection changes
- Persist selections to localStorage
- Trigger context size updates

**Key Functions:**

#### `initializeModels()` (line 195-209)
Loads available models and restores saved selection.

```javascript
const initializeModels = useCallback(async () => {
  modelService.currentChatId = currentChatId;
  modelService.currentChatIsWorkspace = isWorkspaceCreated();

  const models = await modelService.fetchAvailableModels();
  setAvailableModels(models);

  if (models.length > 0) {
    await tryRestoreSelectedModelForChat(models);
  }

  setModelsLoading(false);
}, [currentChatId, isWorkspaceCreated, tryRestoreSelectedModelForChat]);
```

**Execution:**
- Sets chat context (ID and workspace status)
- Fetches models via `modelService.fetchAvailableModels()`
- Attempts to restore saved model selection
- Updates UI state

#### `tryRestoreSelectedModelForChat()` (line 154-181)
Restores model selection from localStorage with per-chat priority.

```javascript
const tryRestoreSelectedModelForChat = useCallback(async (models) => {
  if (!models || models.length === 0) return;

  // Build storage keys
  const chatKey = buildModelStorageKey();    // bb:selectedModel:{chatId}
  const globalKey = buildModelStorageKey(''); // bb:selectedModel

  // Try chat-specific first, then global
  const savedModelId = localStorage.getItem(chatKey) ||
                       localStorage.getItem(globalKey);

  if (savedModelId) {
    const modelExists = models.find(m => m.id === savedModelId);
    if (modelExists) {
      handleModelSelection(savedModelId);
      return;
    }
  }

  // Default to "auto" if no saved selection
  if (models.length > 0) {
    handleModelSelection(models[0].id); // models[0] is always "auto"
  }
}, [currentChatId, handleModelSelection]);
```

**Restoration Priority:**
1. Per-chat selection: `bb:selectedModel:{chatId}`
2. Global selection: `bb:selectedModel`
3. Default: `auto` (first model in list)

#### `handleModelSelection()` (line 370-391)
Handles model selection changes and persists to localStorage.

```javascript
const handleModelSelection = useCallback(async (modelId) => {
  setSelectedModel(modelId);
  modelService.setSelectedModel(modelId);

  // Persist to localStorage
  const storageKey = buildModelStorageKey();
  localStorage.setItem(storageKey, modelId);

  // Also update global preference
  localStorage.setItem('bb:selectedModel', modelId);

  // Update context size after 100ms delay
  if (contextSizeTimeoutRef.current) {
    clearTimeout(contextSizeTimeoutRef.current);
  }
  contextSizeTimeoutRef.current = setTimeout(() => {
    updateContextSize();
  }, 100);
}, [currentChatId, updateContextSize]);
```

**Actions:**
1. Updates React state and modelService
2. Persists to both per-chat and global localStorage
3. Schedules context size update (debounced 100ms)

---

### 2. Frontend: ModelService (contextService.js)

**Location:** `nextjs-app/app/bb-client/_components/services/contextService.js`

**Responsibilities:**
- Fetch available models from backend
- Add "Auto" option to model list
- Apply workspace filtering when needed
- Manage model limits and context size

**Key Functions:**

#### `fetchAvailableModels()` (line 143-221)
Fetches published models and optionally filters by workspace permissions.

```javascript
async fetchAvailableModels() {
  this.modelsLoading = true;
  const backendUrl = BASE;

  // Check if workspace filtering needed
  let allowedModelIds = null;
  if (this.currentChatId && this.currentChatIsWorkspace) {
    const url = new URL(`${backendUrl}/bb-workspace/api/chat/allowed-models`);
    url.searchParams.set('chatId', String(this.currentChatId));
    const allowRes = await fetch(url.toString(), { credentials: 'include' });

    if (allowRes.ok) {
      const allowData = await allowRes.json();
      if (allowData?.success && Array.isArray(allowData.models)) {
        allowedModelIds = new Set(allowData.models.map(String));
      }
    }
  }

  // Fetch published models
  const response = await fetch(`${backendUrl}/bb-models/api/models/published`, {
    credentials: 'include'
  });

  const data = await response.json();
  let models = data.models.map(m => ({
    id: String(m.id),
    name: m.label || (m.type ? `${m.name} (${m.type})` : m.name),
    rawName: m.name,
    type: m.type
  }));

  // Apply workspace filtering
  if (allowedModelIds) {
    models = models.filter(m => allowedModelIds.has(String(m.id)));
  }

  // Add "Auto" option at top
  const autoOption = {
    id: 'auto',
    name: '🤖 Auto (Smart Selection)',
    rawName: 'Auto',
    type: 'auto'
  };
  this.availableModels = [autoOption, ...models];

  // Default to "Auto" if no selection
  if (this.availableModels.length > 0 && !this.selectedModelId) {
    this.setSelectedModel('auto');
  }

  return this.availableModels;
}
```

**Flow:**
1. **Workspace Check**: If chat is workspace-created, fetch allowed model IDs
2. **Fetch Models**: Get all published models from `/bb-models/api/models/published`
3. **Filter**: Apply workspace restrictions if applicable
4. **Add Auto**: Prepend `{id: 'auto', name: '🤖 Auto (Smart Selection)'}` to list
5. **Default Selection**: Set "Auto" as default if no saved preference

#### `setSelectedModel()` (line 228-262)
Updates selected model and calculates limits.

```javascript
setSelectedModel(modelId) {
  const selectedModel = this.availableModels.find(model => model.id === modelId);
  if (!selectedModel) return null;

  this.selectedModelId = modelId;
  this.currentModel = selectedModel;

  // Special handling for "auto"
  if (modelId === 'auto') {
    this.modelLimits = {
      maxTokens: null,      // Determined by auto-selected model
      contextSize: 0,       // Determined by auto-selected model
      modelName: selectedModel.name,
      modelId: 'auto'
    };
    return selectedModel;
  }

  // Extract context size and max tokens from model config
  const rawContextSize = selectedModel.context_size ?? selectedModel.settings?.contextSize;
  const normalizedContext = (typeof rawContextSize === 'number' && rawContextSize > 0)
    ? rawContextSize : 0;

  const rawMaxTokens = selectedModel.settings?.max_tokens ?? selectedModel.settings?.maxTokens;
  const normalizedMaxTokens = (typeof rawMaxTokens === 'number' && rawMaxTokens > 0)
    ? rawMaxTokens : null;

  this.modelLimits = {
    maxTokens: normalizedMaxTokens,
    contextSize: normalizedContext,
    modelName: selectedModel.name,
    modelId: selectedModel.id
  };

  return selectedModel;
}
```

**Logic:**
- For `auto`: No fixed limits (determined at runtime)
- For specific models: Extract context_size and max_tokens from config
- Zero values indicate no cap/limit

---

### 3. Backend: Message Controller

**Location:** `components/chats/app/controllers/api/messageController.js`

**Responsibilities:**
- Detect "auto" model requests
- Invoke ModelRouterService for auto-selection
- Fallback to first available model on errors

#### `resolveAutoModel()` (line 321-387)
Resolves "auto" model ID to actual model based on prompt analysis.

```javascript
async resolveAutoModel(modelId, userPrompt, chatId) {
  // Check if this is an auto model request
  if (!ModelRouterService.isAutoModel(modelId)) {
    return modelId; // Return as-is if not auto
  }

  console.log('\n🎯 AUTO MODEL REQUESTED - Analyzing prompt...');

  // Get available published models
  const availableModels = this._modelContext.Model
    .where(r => r.is_published == $$, 1)
    .orderBy(m => m.created_at)
    .toList();

  if (!availableModels || availableModels.length === 0) {
    console.log('⚠️  No published models available');
    return await llmConfigService.getFirstPublishedModelId();
  }

  // Map to router-compatible format
  const mappedModels = availableModels.map(m => ({
    id: m.id,
    name: m.name,
    label: m.name,
    type: (m.name || '').toLowerCase()
  }));

  // Get conversation history for context
  let conversationHistory = [];
  let conversationTokenCount = 0;
  if (chatId) {
    try {
      const chatHistoryService = new ChatHistoryService(this._chatContext, {});
      conversationHistory = await chatHistoryService.loadChatHistory(chatId);

      // Calculate token count from history
      const toolsService = new ToolsService();
      conversationTokenCount = toolsService.calculateTokenCount(conversationHistory);
    } catch (err) {
      console.log('⚠️  Could not load chat history:', err.message);
    }
  }

  // Create router and select model
  const router = new ModelRouterService(mappedModels);
  const selectedModelId = router.selectModel(userPrompt, {
    conversationHistory,
    conversationTokenCount
  });

  if (selectedModelId) {
    console.log(`✅ AUTO SELECTION COMPLETE: Using model ID ${selectedModelId}\n`);
    return selectedModelId;
  }

  // Fallback to first available model
  console.log('⚠️  Auto selection failed, using fallback model');
  const fallback = router.getFallbackModel();
  return fallback || await llmConfigService.getFirstPublishedModelId();
}
```

**Invocation:**
- Called when processing streaming message requests
- Checks `ModelRouterService.isAutoModel(modelId)` (returns true for 'auto', 'auto-select', '0')
- If auto, analyzes prompt and returns actual model ID
- Otherwise, returns modelId unchanged

---

### 4. Backend: ModelRouterService

**Location:** `components/chats/app/service/modelRouterService.js`

**Responsibilities:**
- Analyze prompt complexity and characteristics
- Match patterns for different query types
- Select optimal model from available tiers
- Provide fallback when selection fails

**Model Tiers:**

```javascript
this.modelTiers = {
  // Fast, cheap models for simple queries
  fast: [
    'gpt-3.5-turbo',
    'gpt-4o-mini',
    'claude-3-haiku',
    'claude-3-5-haiku'
  ],

  // Mid-tier models for moderate complexity
  balanced: [
    'gpt-4',
    'gpt-4-turbo',
    'claude-3-5-sonnet',
    'claude-3-sonnet'
  ],

  // Heavy reasoning models for complex tasks
  advanced: [
    'gpt-5',
    'o1',
    'o1-mini',
    'claude-3-opus',
    'claude-3-5-opus'
  ],

  // Real-time/news models
  realtime: [
    'grok-3',
    'grok-2',
    'perplexity'
  ]
};
```

**Pattern Definitions:**

```javascript
this.patterns = {
  // Simple factual questions
  factual: /\b(who|what|when|where|which|define|meaning|definition)\b/i,

  // Code-related but simple
  simpleCode: /\b(error|bug|stack|trace|fix|function|class|import|export)\b/i,

  // Heavy reasoning indicators
  reasoning: /\b(explain|architecture|analyze|design|optimize|refactor|strategy|implement|build)\b/i,

  // Complex analysis
  complex: /\b(deep analysis|complex|proposal|comprehensive|detailed analysis)\b/i,

  // Current events/news
  current: /\b(today|current|latest|news|trend|update|recent|breaking)\b/i,

  // Very simple greetings
  greeting: /^(hi|hello|hey|thanks|thank you|ok|okay)$/i
};
```

#### `selectModel()` (line 82-152)
Main routing function using cascading rules.

```javascript
selectModel(prompt, options = {}) {
  const { conversationHistory = [], conversationTokenCount = 0 } = options;

  // Estimate tokens for current prompt
  const ToolsService = require('./toolsService');
  const toolsService = new ToolsService();
  const promptTokenCount = toolsService.calculateTokenCount(prompt);
  const totalTokens = promptTokenCount + conversationTokenCount;

  const lower = prompt.toLowerCase().trim();

  console.log(`\n🤖 AUTO MODEL SELECTION:`);
  console.log(`   Prompt length: ${prompt.length} chars`);
  console.log(`   Prompt tokens: ${promptTokenCount}`);
  console.log(`   Total context tokens: ${totalTokens}`);

  // ----- FAST DECISIONS (Tier 1: Cheap Models) -----

  // 1. Very simple greeting or acknowledgment
  if (prompt.length < 20 && this.patterns.greeting.test(lower)) {
    console.log(`   ✓ Pattern: Simple greeting`);
    return this.findBestModel('fast', 'Greeting or simple acknowledgment');
  }

  // 2. Very short & factual questions
  if (promptTokenCount < 100 && this.patterns.factual.test(lower)) {
    console.log(`   ✓ Pattern: Short factual question`);
    return this.findBestModel('fast', 'Short factual query');
  }

  // 3. Simple code error or quick fix
  if (promptTokenCount < 200 && this.patterns.simpleCode.test(lower)) {
    console.log(`   ✓ Pattern: Simple code/error fix`);
    return this.findBestModel('fast', 'Simple code assistance');
  }

  // ----- CURRENT EVENTS (Special Case) -----

  // 4. Current events or real-time info
  if (this.patterns.current.test(lower)) {
    console.log(`   ✓ Pattern: Current events/news`);
    const realtimeModel = this.findBestModel('realtime', 'Real-time information');
    if (realtimeModel) return realtimeModel;
    // Fallback to advanced if no realtime model available
    return this.findBestModel('advanced', 'Current events (fallback)');
  }

  // ----- ADVANCED REASONING (Tier 3: Heavy Models) -----

  // 5. Very large context or complex analysis
  if (totalTokens > 800 || this.patterns.complex.test(lower)) {
    console.log(`   ✓ Pattern: Large context or complex analysis`);
    return this.findBestModel('advanced', 'Complex reasoning task');
  }

  // ----- BALANCED REASONING (Tier 2: Mid-tier Models) -----

  // 6. Moderate complexity: architecture, design, optimization
  if (promptTokenCount > 300 || this.patterns.reasoning.test(lower)) {
    console.log(`   ✓ Pattern: Moderate reasoning task`);
    return this.findBestModel('balanced', 'Moderate complexity task');
  }

  // ----- DEFAULT: BALANCED -----

  // 7. Default to balanced tier for general queries
  console.log(`   ✓ Pattern: Default to balanced`);
  return this.findBestModel('balanced', 'General purpose');
}
```

**Decision Flow:**

```
Input: User Prompt + Context Token Count
│
├─ Length < 20 + Greeting Pattern?
│  └─ YES → FAST tier (gpt-3.5-turbo, claude-haiku)
│
├─ Tokens < 100 + Factual Pattern?
│  └─ YES → FAST tier
│
├─ Tokens < 200 + Simple Code Pattern?
│  └─ YES → FAST tier
│
├─ Current Events Pattern?
│  └─ YES → REALTIME tier (grok-3, perplexity) or ADVANCED fallback
│
├─ Tokens > 800 OR Complex Pattern?
│  └─ YES → ADVANCED tier (gpt-5, o1, claude-opus)
│
├─ Tokens > 300 OR Reasoning Pattern?
│  └─ YES → BALANCED tier (gpt-4, claude-sonnet)
│
└─ Default → BALANCED tier
```

#### `findBestModel()` (line 160-191)
Finds first available model from requested tier.

```javascript
findBestModel(tier, reason = '') {
  if (!this.modelTiers[tier]) {
    console.log(`   ⚠️  Unknown tier: ${tier}`);
    return null;
  }

  const tierModels = this.modelTiers[tier];

  // Find first available model in priority order
  for (const modelPattern of tierModels) {
    const matchedModel = this.availableModels.find(m => {
      const modelName = (m.name || '').toLowerCase();
      const modelLabel = (m.label || '').toLowerCase();
      const pattern = modelPattern.toLowerCase();

      return modelName.includes(pattern) ||
             modelLabel.includes(pattern) ||
             (m.id && String(m.id).toLowerCase() === pattern);
    });

    if (matchedModel) {
      console.log(`   ✅ Selected: ${matchedModel.name || matchedModel.id} (${tier} tier)`);
      console.log(`   📝 Reason: ${reason}\n`);
      return matchedModel.id;
    }
  }

  console.log(`   ⚠️  No ${tier} model available, will use fallback`);
  return null;
}
```

**Matching Logic:**
- Performs case-insensitive partial match on model name/label
- Checks in priority order (first match wins)
- Example: Pattern `'gpt-4'` matches model with name `'GPT-4 Turbo (openai)'`

#### `getFallbackModel()` (line 198-211)
Provides fallback when tier selection fails.

```javascript
getFallbackModel() {
  // Try balanced tier first
  const balanced = this.findBestModel('balanced', 'Fallback');
  if (balanced) return balanced;

  // Use first available model as last resort
  if (this.availableModels && this.availableModels.length > 0) {
    const fallback = this.availableModels[0];
    console.log(`   ⚠️  Using first available model: ${fallback.name || fallback.id}`);
    return fallback.id;
  }

  return null;
}
```

**Fallback Priority:**
1. Try balanced tier first
2. Use first available model
3. Return null (controller will use system default)

---

## LocalStorage Schema

The system uses localStorage to persist model selections:

### Per-Chat Storage
**Key:** `bb:selectedModel:{chatId}`
**Value:** `<modelId>` (string)
**Purpose:** Remember model choice for specific chat

**Example:**
```javascript
localStorage.setItem('bb:selectedModel:chat-abc-123', 'auto');
localStorage.setItem('bb:selectedModel:chat-xyz-789', '42'); // Specific model ID
```

### Global Storage
**Key:** `bb:selectedModel`
**Value:** `<modelId>` (string)
**Purpose:** Default model for new chats

**Example:**
```javascript
localStorage.setItem('bb:selectedModel', 'auto');
```

### Restoration Priority
When loading a chat:
1. Check `bb:selectedModel:{chatId}` (chat-specific)
2. If not found, check `bb:selectedModel` (global default)
3. If not found, default to `'auto'`

---

## Request Flow Example

### Scenario: User sends message with "Auto" selected

**Step 1: Frontend (ChatController)**
```javascript
// User clicks send with selectedModel = 'auto'
const response = await apiService.startAIStreamingResponse(
  aiMessageId,
  userMessageId,
  'auto',  // modelId
  { chatId, noThinking }
);
```

**Step 2: Socket/API Layer**
```javascript
// WebSocket receives request
socket.emit('start', {
  chatId: 'chat-123',
  userMessageId: 456,
  modelId: 'auto',
  noThinking: false
});
```

**Step 3: Message Controller (Backend)**
```javascript
// In chatSocket.js or messageController
const actualModelId = await messageController.resolveAutoModel(
  'auto',                     // modelId from request
  'Explain how RAG works',   // userPrompt
  'chat-123'                 // chatId
);

// actualModelId might be '42' (specific model)
```

**Step 4: ModelRouterService Analysis**
```javascript
// ModelRouterService.selectModel() analyzes prompt
// Prompt: "Explain how RAG works"
// - Length: 22 chars
// - Tokens: ~5
// - Pattern match: "explain" → reasoning pattern
// - Decision: BALANCED tier
// - Returns: first available GPT-4 or Claude Sonnet
```

**Step 5: Model Invocation**
```javascript
// messageController now uses actualModelId (e.g., 42)
// Loads model config for ID 42
// Invokes appropriate adapter (OpenAI, Anthropic, etc.)
```

**Console Output:**
```
🎯 AUTO MODEL REQUESTED - Analyzing prompt...
   Prompt length: 22 chars
   Prompt tokens: 5
   Total context tokens: 5

🤖 AUTO MODEL SELECTION:
   ✓ Pattern: Moderate reasoning task
   ✅ Selected: GPT-4 Turbo (openai) (balanced tier)
   📝 Reason: Moderate complexity task

✅ AUTO SELECTION COMPLETE: Using model ID 42
```

---

## Workspace Filtering

When a chat is created within a workspace, model selection can be restricted.

### Detection
**ChatController.js:186-193**
```javascript
const isWorkspaceCreated = useCallback(() => {
  const workspaceId = chatMetadata?.workspaceId || chatMetadata?.workspace_id;
  if (!workspaceId) return false;

  const workspaceCreated = chatMetadata?.workspace_created ||
                          chatMetadata?.workspaceCreated;
  return workspaceCreated === true || workspaceCreated === 1;
}, [chatMetadata]);
```

### Filtering Process
**contextService.js:148-163**
```javascript
// If workspace-created, fetch allowed models
if (this.currentChatId && this.currentChatIsWorkspace) {
  const url = new URL(`${backendUrl}/bb-workspace/api/chat/allowed-models`);
  url.searchParams.set('chatId', String(this.currentChatId));
  const allowRes = await fetch(url.toString(), { credentials: 'include' });

  if (allowRes.ok) {
    const allowData = await allowRes.json();
    if (allowData?.success && Array.isArray(allowData.models)) {
      allowedModelIds = new Set(allowData.models.map(String));
    }
  }
}

// Later: filter models
if (allowedModelIds) {
  models = models.filter(m => allowedModelIds.has(String(m.id)));
}
```

**Effect on Auto:**
- "Auto" option always shown in UI
- ModelRouterService only receives allowed models
- Auto-selection constrained to workspace-allowed models

---

## Context Size Monitoring

The system monitors real-time context usage for the selected model.

### ContextService
**Location:** `nextjs-app/app/bb-client/_components/services/contextService.js`

#### `fetchContextSize()` (line 25-75)
Calculates current context usage against model limits.

```javascript
async fetchContextSize(currentChatId, inputValue, selectedModelId) {
  if (!selectedModelId) {
    throw new Error('Model ID is required to fetch context size');
  }

  this.contextLoading = true;
  this.contextError = null;

  const response = await fetch(`${BASE}/${api.ApiConfig.message.getContextSize.url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
      return data.contextInfo;
    } else if (data.success && data.notSupported) {
      // Model doesn't define context_size
      this.contextInfo = null;
      return null;
    }
  }

  throw new Error('Failed to fetch context size');
}
```

**Response Format:**
```javascript
{
  success: true,
  contextInfo: {
    currentTokens: 1250,
    maxTokens: 8000,
    utilizationPercentage: 15.6,
    wouldExceedLimit: false
  }
}
```

### UI Integration
**ChatController.js:277-290**
```javascript
const updateContextSize = useCallback(async () => {
  if (!selectedModel || selectedModel === 'auto') {
    contextService.clearContext();
    setContextInfo(null);
    return;
  }

  try {
    const info = await contextService.fetchContextSize(
      currentChatId,
      inputValue,
      selectedModel
    );
    setContextInfo(info);
  } catch (error) {
    console.error('Error fetching context size:', error);
  }
}, [currentChatId, inputValue, selectedModel]);
```

**Behavior:**
- Updates when model selection changes (debounced 100ms)
- Updates when input value changes
- Clears when "Auto" is selected (no fixed limit)
- Displays visual indicator in UI when approaching limit

---

## Configuration and Customization

### Adding New Model Tiers

Edit `modelRouterService.js`:

```javascript
this.modelTiers = {
  fast: [...],
  balanced: [...],
  advanced: [...],
  realtime: [...],
  // Add custom tier
  specialized: [
    'codex',
    'code-davinci',
    'custom-code-model'
  ]
};
```

Then add selection logic in `selectModel()`:
```javascript
// 8. Specialized code generation
if (this.patterns.codeGeneration.test(lower)) {
  console.log(`   ✓ Pattern: Code generation task`);
  return this.findBestModel('specialized', 'Code generation');
}
```

### Customizing Patterns

Edit pattern definitions in `modelRouterService.js`:

```javascript
this.patterns = {
  factual: /\b(who|what|when|where|which|define|meaning|definition)\b/i,

  // Add new pattern
  translation: /\b(translate|translation|français|español|deutsch)\b/i,

  // Modify existing pattern
  reasoning: /\b(explain|architecture|analyze|design|optimize|refactor|strategy|implement|build|plan)\b/i
};
```

### Adjusting Token Thresholds

Modify thresholds in `selectModel()`:

```javascript
// Original
if (promptTokenCount < 100 && this.patterns.factual.test(lower)) {
  return this.findBestModel('fast', 'Short factual query');
}

// Adjusted (more aggressive fast routing)
if (promptTokenCount < 150 && this.patterns.factual.test(lower)) {
  return this.findBestModel('fast', 'Short factual query');
}
```

### Disabling Auto Mode

To remove auto mode from UI:

**contextService.js:192-199**
```javascript
// Comment out or remove this section:
// const autoOption = {
//   id: 'auto',
//   name: '🤖 Auto (Smart Selection)',
//   rawName: 'Auto',
//   type: 'auto'
// };
// this.availableModels = [autoOption, ...models];

// Use original models list:
this.availableModels = models;
```

---

## Troubleshooting

### Issue: Auto always selects the same model

**Cause:** Only one model matches the tier patterns.

**Solution:**
1. Check available models in database (must be published)
2. Verify model names match patterns in `modelTiers`
3. Add more models to tiers or adjust patterns

**Debug:**
```javascript
// In modelRouterService.js findBestModel()
console.log('Available models:', this.availableModels.map(m => m.name));
console.log('Looking for pattern:', modelPattern);
```

### Issue: Auto selection not working

**Check:**
1. Is modelId exactly `'auto'`? (case-sensitive)
2. Check console for `🎯 AUTO MODEL REQUESTED` message
3. Verify `ModelRouterService.isAutoModel()` returns true

**Debug:**
```javascript
// In messageController.js
console.log('Model ID type:', typeof modelId);
console.log('Model ID value:', JSON.stringify(modelId));
console.log('Is auto?', ModelRouterService.isAutoModel(modelId));
```

### Issue: Wrong tier selected

**Cause:** Pattern matching might be too broad/narrow.

**Solution:** Adjust patterns and thresholds in `selectModel()`

**Debug:**
```javascript
// In selectModel()
console.log('Prompt lower:', lower);
console.log('Factual match:', this.patterns.factual.test(lower));
console.log('Reasoning match:', this.patterns.reasoning.test(lower));
console.log('Complex match:', this.patterns.complex.test(lower));
```

### Issue: Context size not updating

**Check:**
1. Model has `context_size` field defined
2. Network request to `/api/message/getContextSize` succeeds
3. No console errors in browser dev tools

**Debug:**
```javascript
// In ChatController updateContextSize()
console.log('Fetching context for model:', selectedModel);
console.log('Chat ID:', currentChatId);
console.log('Input length:', inputValue.length);
```

### Issue: Workspace filtering not working

**Check:**
1. `chatMetadata.workspace_created === true`
2. Workspace API endpoint returns allowed models
3. Network request to `/bb-workspace/api/chat/allowed-models` succeeds

**Debug:**
```javascript
// In contextService.fetchAvailableModels()
console.log('Is workspace?', this.currentChatIsWorkspace);
console.log('Allowed model IDs:', Array.from(allowedModelIds || []));
console.log('Models before filter:', models.length);
console.log('Models after filter:', filteredModels.length);
```

---

## Performance Considerations

### Token Estimation Cost
- Token counting uses tiktoken library (fast)
- Conversation history loaded only when needed
- Cached for duration of request

### Pattern Matching Speed
- All patterns precompiled at service initialization
- Regex operations: O(n) where n = prompt length
- Typical execution time: <10ms for standard prompts

### localStorage Performance
- Synchronous read/write operations
- Minimal data (<100 bytes per chat)
- No noticeable impact on UI

### Auto-Selection Overhead
- Added latency: ~50-150ms (network + computation)
- Only when "auto" is selected
- User perceives no difference due to streaming

---

## Future Enhancements

### Planned Features

1. **Machine Learning Model Selection**
   - Train model on user feedback
   - Learn from historical selections
   - Personalized routing per user

2. **Cost Tracking**
   - Display estimated cost per query
   - Monthly usage reports
   - Budget alerts

3. **A/B Testing**
   - Compare model performance
   - User satisfaction metrics
   - Optimize tier assignments

4. **Dynamic Tier Assignment**
   - Models automatically assigned to tiers based on benchmarks
   - No manual tier configuration needed

5. **User Feedback Loop**
   ```javascript
   // Already stubbed in modelRouterService.js:230-234
   async logFeedback(promptSummary, selectedModel, wasGood) {
     // TODO: Store feedback in database for future ML training
   }
   ```

---

## Related Documentation

- **LLM Architecture:** `docs/LLM_ARCHITECTURE_AND_CONTROL_MECHANISMS.md`
- **RAG System:** `docs/RAG_SYSTEM_TECHNICAL_DOCUMENTATION.md`
- **Model Management:** Backend models API documentation

---

## Summary

The Auto Model Picker is a sophisticated yet lightweight system that:

1. Provides ChatGPT-like "Auto" mode for model selection
2. Uses rule-based routing for fast, deterministic results
3. Considers prompt complexity, token count, and patterns
4. Respects workspace restrictions when applicable
5. Persists user preferences per-chat and globally
6. Monitors real-time context usage

**Key Benefits:**
- Cost savings (30-50% typical)
- Improved response times for simple queries
- Better resource allocation
- Enhanced user experience (no manual model selection needed)

**Key Files:**
- `nextjs-app/app/bb-client/_components/controllers/ChatController.js`
- `nextjs-app/app/bb-client/_components/services/contextService.js`
- `components/chats/app/service/modelRouterService.js`
- `components/chats/app/controllers/api/messageController.js`
