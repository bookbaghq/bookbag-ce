# LLM Architecture and Control Mechanisms

**Version**: 1.1
**Last Updated**: 2025-10-19
**Purpose**: Comprehensive guide to understanding adapters, providers, grounding modes, system prompts, prompt templates, profiles, and how they all work together to give you complete control over your LLM behavior.

---

## Table of Contents

1. [Overview: Why Multiple Control Layers?](#overview-why-multiple-control-layers)
2. [Architecture Diagram](#architecture-diagram)
3. [Understanding Adapters: The Core Abstraction](#understanding-adapters-the-core-abstraction)
4. [Control Mechanism #1: Providers](#control-mechanism-1-providers)
5. [Control Mechanism #2: System Prompts](#control-mechanism-2-system-prompts)
6. [Control Mechanism #3: Prompt Templates](#control-mechanism-3-prompt-templates)
7. [Control Mechanism #4: Profiles](#control-mechanism-4-profiles)
8. [Control Mechanism #5: Grounding Modes](#control-mechanism-5-grounding-modes)
9. [How They All Work Together](#how-they-all-work-together)
10. [File Architecture & Flow](#file-architecture--flow)
11. [Real-World Examples](#real-world-examples)
12. [Troubleshooting Guide](#troubleshooting-guide)

---

## Overview: Why Multiple Control Layers?

### The Problem

Different LLM providers (OpenAI, Anthropic, Grok, Gemini) have:
- **Different APIs** (different request formats)
- **Different behaviors** (some hallucinate more, some are more creative)
- **Different capabilities** (vision, function calling, thinking modes)
- **Different pricing** (per token, per request)

Your application needs to:
1. **Abstract** the differences between providers
2. **Control** how the LLM behaves in different contexts
3. **Inject** dynamic context (like RAG knowledge base results)
4. **Maintain** conversation history correctly
5. **Switch** between providers/models without rewriting code

### The Solution: Layered Control Architecture

Each control mechanism serves a specific purpose and operates at a different level:

```
┌─────────────────────────────────────────────────────────────┐
│  User Question: "Who is Sara married to?"                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 5: GROUNDING MODE (RAG Context Injection)            │
│  → Injects knowledge base context                           │
│  → Controls how strictly LLM must use retrieved docs        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4: PROFILES (User-Level Preferences)                 │
│  → "Professional tone" vs "Casual tone"                     │
│  → Response length preferences                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: PROMPT TEMPLATES (Message Formatting)             │
│  → Converts internal format to provider-specific format     │
│  → Handles special tokens like <|im_start|>                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: SYSTEM PROMPTS (Base Behavior)                    │
│  → "You are a helpful assistant"                            │
│  → Core personality and capabilities                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: PROVIDERS (API Abstraction)                       │
│  → Routes to correct adapter (OpenAI, Anthropic, etc)       │
│  → Handles API-specific request/response formats            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  LLM API (GPT-4, Claude, Grok, etc)                         │
└─────────────────────────────────────────────────────────────┘
```

Each layer is **independent but complementary** - they work together to give you complete control.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                                │
│  (Frontend: Next.js)                                                  │
│  - Chat input                                                         │
│  - Message display                                                    │
│  - File uploads (RAG)                                                 │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ Socket.io
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      SOCKET HANDLER                                   │
│  File: app/sockets/chatSocket.js                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 1. Load chat history                                          │   │
│  │ 2. Query RAG system (if enabled)                              │   │
│  │ 3. Inject RAG grounding (LAYER 5)                             │   │
│  │ 4. Apply context window trimming                              │   │
│  │ 5. Call ModelService._generate()                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      MODEL SERVICE                                    │
│  File: components/chats/app/service/modelService.js                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Routes to correct provider adapter based on model.provider    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      PROVIDER ADAPTER (LAYER 1)                       │
│  File: components/chats/app/service/adapters/openaiAdapter.js       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ _buildMessages():                                             │   │
│  │   1. Extract system message from messageHistory (LAYER 2)     │   │
│  │   2. Apply prompt template if configured (LAYER 3)            │   │
│  │   3. Convert to provider-specific format                      │   │
│  │   4. Handle attachments (images, files)                       │   │
│  │                                                                │   │
│  │ _buildPayload():                                              │   │
│  │   - Add model settings (temperature, max_tokens, etc)         │   │
│  │                                                                │   │
│  │ _handleStreamingResponse():                                   │   │
│  │   - Process SSE stream                                        │   │
│  │   - Call onChunk callback                                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ HTTPS Request
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      LLM PROVIDER API                                 │
│  - OpenAI: api.openai.com/v1/chat/completions                        │
│  - Anthropic: api.anthropic.com/v1/messages                          │
│  - Grok: api.x.ai/v1/chat/completions                                │
│  - etc.                                                               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Understanding Adapters: The Core Abstraction

### What Are Adapters?

**Adapters** are the bridge between your application's internal message format and the specific API format required by each LLM provider. They are the **translation layer** that makes it possible to use any LLM with the same application code.

Think of adapters like **power adapters for international travel**:
- Your device (application) speaks one "language" (internal format)
- Different countries (LLM providers) use different outlets (API formats)
- The adapter translates between them without changing your device

### Why Adapters Make LLMs Function Better

#### Without Adapters (Tightly Coupled)

```javascript
// ❌ BAD: Hardcoded to OpenAI format
async function chat(messages) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      temperature: 0.7
    })
  });

  return response.json();
}

// Now you want to use Claude...
// ❌ You have to rewrite EVERYTHING:
// - Different URL
// - Different auth headers
// - Different request format
// - Different response format
// - Different streaming protocol
// This breaks every file that calls chat()!
```

#### With Adapters (Loosely Coupled)

```javascript
// ✅ GOOD: Adapter pattern
async function chat(messages, provider) {
  const adapter = getAdapter(provider); // openai, claude, grok, etc.
  return await adapter.generate(messages);
}

// Want to use Claude instead?
// ✅ Just change one parameter - code stays the same!
chat(messages, 'claude'); // Adapter handles all the differences
```

### The Adapter Pattern in BookBag CE

#### Architecture Overview

```
Your Application Code (Internal Format)
         ↓
    Provider Router (modelService.js)
         ↓
  Adapter Selection (based on model.provider)
         ↓
    ┌──────────┬──────────┬──────────┬──────────┐
    │  OpenAI  │  Claude  │   Grok   │  Gemini  │
    │ Adapter  │ Adapter  │ Adapter  │ Adapter  │
    └──────────┴──────────┴──────────┴──────────┘
         ↓          ↓          ↓          ↓
    OpenAI API  Claude API  Grok API  Gemini API
```

Each adapter implements the **same interface** but handles provider-specific details:

```javascript
class Adapter {
  async generate(messageHistory, onChunk, noThinking, modelConfig) {
    // 1. Convert internal format → provider format
    // 2. Make API request
    // 3. Handle streaming response
    // 4. Convert provider format → internal format
    // 5. Return result
  }
}
```

### How Adapters Are Called

#### Step 1: Application Code Creates Request

**File**: `app/sockets/chatSocket.js` (lines 530-558)

```javascript
// Application prepares message history with RAG context
const messageHistory = [
  {
    role: 'system',
    content: 'You are helpful.\n\n--- RAG Context ---\nSara is married to John...'
  },
  {
    role: 'user',
    content: 'Who is Sara married to?'
  }
];

// Call the model service
generationResult = await this.modelService._generate(
  messageHistory,
  tokenCallback,  // Streaming callback
  noThinking,     // Thinking mode flag
  this.modelConfig // Model configuration
);
```

**At this point**: Messages are in **internal format** (your app's standard structure)

#### Step 2: Model Service Routes to Adapter

**File**: `components/chats/app/service/modelService.js` (lines 27-36)

```javascript
async _generate(messageHistory, onChunk, noThinking, modelConfig) {
    // Extract provider from model config (database)
    const provider = (modelConfig?.provider || 'openai').toLowerCase();

    console.log(`🎯 ModelService routing to provider: ${provider}`);

    // Instantiate the correct adapter
    // Currently all use OpenAIAdapter (OpenAI, Grok, Azure are compatible)
    const adapter = new OpenAIAdapter();

    // Delegate to adapter - adapter handles all provider-specific logic
    return await adapter.generate(messageHistory, onChunk, noThinking, modelConfig);
}
```

**Key Points**:
- Model Service doesn't know about API details
- It only knows which adapter to use
- Adapter selection is data-driven (from database)
- Easy to add new adapters without changing this code

#### Step 3: Adapter Converts Format

**File**: `components/chats/app/service/adapters/openaiAdapter.js` (lines 17-62)

```javascript
async generate(messageHistory, onChunk, noThinking, modelConfig) {
    // Extract configuration
    const settings = modelConfig.settings;
    const baseUrl = String(modelConfig.server_url || '').replace(/\/?$/, '/');
    const apiKey = String(modelConfig.api_key || '');
    const modelName = String(modelConfig.name || '');

    // Validate configuration
    if (!apiKey) {
        throw new Error('Missing API key');
    }

    // Build provider-specific URL
    const url = `${baseUrl}chat/completions`;

    // Build provider-specific headers
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    // 🔥 CRITICAL: Convert internal format → OpenAI format
    const oaiMessages = this._buildMessages(messageHistory, modelConfig);

    // 🔥 CRITICAL: Build API payload with settings
    const payload = this._buildPayload(modelName, oaiMessages, settings);

    // Make API request
    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });

    // Handle errors
    if (!res.ok) {
        return this._handleError(res);
    }

    // Handle streaming or non-streaming response
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
        return await this._handleNonStreamingResponse(res, onChunk, modelConfig);
    }

    return await this._handleStreamingResponse(res, onChunk, modelConfig);
}
```

### Deep Dive: Adapter Methods

#### Method 1: `_buildMessages()` - Format Conversion

**Purpose**: Convert internal message format to provider-specific format

**File**: `components/chats/app/service/adapters/openaiAdapter.js` (lines 68-131)

```javascript
_buildMessages(messageHistory, modelConfig) {
    const templateString = String(modelConfig.prompt_template || '').trim();

    // 🔥 CRITICAL RAG FIX: Extract system message from messageHistory
    // messageHistory may contain RAG context injected by chatSocket
    const systemMessageFromHistory = messageHistory.find(m => m.role === 'system');
    const systemPrompt = systemMessageFromHistory
        ? String(systemMessageFromHistory.content || '').trim()
        : (typeof modelConfig.system_prompt === 'string' && modelConfig.system_prompt.trim().length > 0)
            ? modelConfig.system_prompt.trim()
            : '';

    let oaiMessages = [];

    // Try to use prompt template if available (for special models)
    if (templateString) {
        try {
            oaiMessages = promptTemplateService.renderToOpenAIMessages(
                templateString,
                messageHistory,
                systemPrompt
            );
        } catch (e) {
            console.error('⚠️ Template rendering failed, falling back:', e?.message);
        }
    }

    // Fallback: Naive conversion (most common path)
    if (oaiMessages.length === 0) {
        for (const m of messageHistory) {
            const role = (m.role || '').toLowerCase();

            if (role === 'system' || role === 'user' || role === 'assistant') {
                // Check if message has attachments (images for vision models)
                if (m.attachments && Array.isArray(m.attachments) && m.attachments.length > 0) {
                    // Vision API format: content as array with text and image_url objects
                    const contentArray = [
                        {
                            type: 'text',
                            text: String(m.content || '')
                        }
                    ];

                    // Add each image URL
                    for (const imageUrl of m.attachments) {
                        contentArray.push({
                            type: 'image_url',
                            image_url: {
                                url: imageUrl
                            }
                        });
                    }

                    oaiMessages.push({ role, content: contentArray });
                } else {
                    // Regular text-only message
                    oaiMessages.push({ role, content: String(m.content || '') });
                }
            }
        }
    }

    return oaiMessages;
}
```

**What This Method Does**:
1. ✅ Extracts system prompt from messageHistory (contains RAG context)
2. ✅ Applies prompt template if configured (for special models like Llama)
3. ✅ Converts attachments to vision format (for GPT-4 Vision)
4. ✅ Filters out invalid roles
5. ✅ Returns OpenAI-compatible message array

**Input Example** (internal format):
```javascript
[
  {
    role: 'system',
    content: 'You are helpful.\n\n--- RAG Context ---\nSara is married to John...'
  },
  {
    role: 'user',
    content: 'Who is Sara married to?',
    attachments: ['https://example.com/image.jpg']
  }
]
```

**Output Example** (OpenAI format):
```javascript
[
  {
    role: 'system',
    content: 'You are helpful.\n\n--- RAG Context ---\nSara is married to John...'
  },
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Who is Sara married to?'
      },
      {
        type: 'image_url',
        image_url: {
          url: 'https://example.com/image.jpg'
        }
      }
    ]
  }
]
```

#### Method 2: `_buildPayload()` - Add Settings

**Purpose**: Add model settings (temperature, max_tokens, etc.) to API payload

**File**: `components/chats/app/service/adapters/openaiAdapter.js` (lines 133-151)

```javascript
_buildPayload(modelName, messages, settings) {
    // Base payload required by OpenAI API
    const basePayload = {
        model: modelName,
        messages: messages,
        stream: true  // Enable streaming
    };

    // Add optional settings from model config
    const settingsPayload = {};
    try {
        if (settings && typeof settings === 'object') {
            for (const key of Object.keys(settings)) {
                // Don't allow settings to override required fields
                if (key === 'model' || key === 'messages' || key === 'stream') continue;

                const value = settings[key];
                if (value === null || typeof value === 'undefined') continue;

                // Add setting to payload
                settingsPayload[key] = value;
            }
        }
    } catch (_) {}

    // Merge base payload with settings
    return Object.assign({}, basePayload, settingsPayload);
}
```

**Input**:
```javascript
modelName = 'gpt-4'
messages = [{ role: 'user', content: 'Hello' }]
settings = {
  temperature: 0.7,
  max_tokens: 2000,
  top_p: 0.9,
  frequency_penalty: 0.1
}
```

**Output**:
```javascript
{
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
  temperature: 0.7,
  max_tokens: 2000,
  top_p: 0.9,
  frequency_penalty: 0.1
}
```

#### Method 3: `_handleStreamingResponse()` - Process SSE

**Purpose**: Process Server-Sent Events (SSE) stream from LLM API

**File**: `components/chats/app/service/adapters/openaiAdapter.js` (lines 190-265)

```javascript
async _handleStreamingResponse(res, onChunk, modelConfig) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    let done = false;

    while (!done) {
        // Read chunk from stream
        const { value, done: readerDone } = await reader.read();
        if (readerDone) break;

        // Decode bytes to text
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;

            // Parse SSE format: "data: {json}"
            if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.slice(6);
                try {
                    const parsed = JSON.parse(jsonStr);

                    // Extract content delta from response
                    const delta = parsed?.choices?.[0]?.delta?.content;

                    if (delta) {
                        full += delta;

                        // Call application's onChunk callback
                        if (onChunk) {
                            onChunk(delta);
                        }
                    }

                    // Check if generation is complete
                    const finishReason = parsed?.choices?.[0]?.finish_reason;
                    if (finishReason) {
                        done = true;
                    }
                } catch (e) {
                    console.error('Error parsing SSE chunk:', e);
                }
            }
        }
    }

    return {
        response: full,
        metadata: {
            completed: true,
            model: modelConfig.id
        }
    };
}
```

**What This Method Does**:
1. ✅ Reads streaming response byte-by-byte
2. ✅ Parses SSE format (`data: {json}\n\n`)
3. ✅ Extracts content deltas
4. ✅ Calls `onChunk()` callback for each chunk (real-time streaming to frontend)
5. ✅ Detects completion and returns full response

**SSE Stream Example**:
```
data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"Sara"}}]}

data: {"id":"chatcmpl-123","choices":[{"delta":{"content":" is"}}]}

data: {"id":"chatcmpl-123","choices":[{"delta":{"content":" married"}}]}

data: {"id":"chatcmpl-123","choices":[{"delta":{"content":" to"}}]}

data: {"id":"chatcmpl-123","choices":[{"delta":{"content":" John"}}]}

data: {"id":"chatcmpl-123","choices":[{"finish_reason":"stop"}]}

data: [DONE]
```

**Result**: `"Sara is married to John"` (with each chunk sent to frontend in real-time)

### How Adapters Improve LLM Function

#### 1. **Abstraction: Use Any LLM Without Code Changes**

**Scenario**: You start with OpenAI GPT-4, later want to try Anthropic Claude

**Without Adapters**:
```javascript
// Week 1: Using OpenAI
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${key}` },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{role: 'user', content: 'Hello'}]
  })
});

// Week 2: Want to use Claude
// ❌ Have to rewrite EVERYTHING in 50+ files
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': key,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-3-opus-20240229',
    messages: [{role: 'user', content: 'Hello'}],
    max_tokens: 1024
  })
});
```

**With Adapters**:
```sql
-- Just update database
UPDATE models SET provider = 'anthropic' WHERE id = 1;
```
✅ **Done!** All 50+ files work automatically with Claude

#### 2. **Consistency: Same Interface for All Models**

**Without Adapters**:
```javascript
// OpenAI format
const openaiResult = {
  choices: [{ message: { content: "Hello" } }]
};

// Claude format
const claudeResult = {
  content: [{ text: "Hello" }]
};

// Gemini format
const geminiResult = {
  candidates: [{ content: { parts: [{ text: "Hello" }] } }]
};

// ❌ Application code needs if/else for each provider
if (provider === 'openai') {
  const text = result.choices[0].message.content;
} else if (provider === 'claude') {
  const text = result.content[0].text;
} else if (provider === 'gemini') {
  const text = result.candidates[0].content.parts[0].text;
}
```

**With Adapters**:
```javascript
// ✅ All adapters return same format
const result = await adapter.generate(messages);
const text = result.response; // Works for all providers
```

#### 3. **Error Handling: Normalized Across Providers**

**File**: `components/chats/app/service/adapters/openaiAdapter.js` (lines 157-168)

```javascript
async _handleError(res) {
    const txt = await res.text().catch(() => "");
    const errorService = require(`${master.root}/app/service/errorService`);

    // Normalize provider-specific errors to standard format
    const normalized = errorService.normalizeProviderError(txt, res.status, 'openai-compatible');

    const err = new Error(normalized.message || `Request failed (${res.status})`);
    err.status = normalized.status;
    err.code = normalized.code;
    err.type = normalized.type;
    err.provider = normalized.provider;
    err.details = normalized.details;
    throw err;
}
```

**Without Adapters**:
```javascript
// OpenAI error
{ "error": { "message": "Rate limit exceeded", "type": "rate_limit_error" } }

// Claude error
{ "error": { "type": "rate_limit_error", "message": "Rate limit exceeded" } }

// Gemini error
{ "error": { "code": 429, "message": "Quota exceeded", "status": "RESOURCE_EXHAUSTED" } }

// ❌ Application needs different handling for each
```

**With Adapters**:
```javascript
// ✅ All errors normalized to standard format
{
  message: "Rate limit exceeded",
  code: "RATE_LIMIT",
  status: 429,
  type: "rate_limit_error",
  provider: "openai"
}
```

#### 4. **Feature Support: Handle Provider Differences Gracefully**

**Example**: Vision Support (Images)

**Without Adapters**:
```javascript
// ❌ Application code needs to know which providers support vision
if (provider === 'openai' && model.includes('vision')) {
  // Send image in OpenAI vision format
} else if (provider === 'claude' && model.includes('3')) {
  // Send image in Claude format
} else if (provider === 'gemini') {
  // Send image in Gemini format
} else {
  // Error: this provider doesn't support images
}
```

**With Adapters**:
```javascript
// ✅ Adapter handles provider capabilities automatically
const messages = [
  {
    role: 'user',
    content: 'What's in this image?',
    attachments: ['https://example.com/image.jpg']
  }
];

// Adapter automatically converts to correct format for provider
await adapter.generate(messages);
```

**OpenAI Adapter** converts to:
```javascript
{
  role: 'user',
  content: [
    { type: 'text', text: 'What's in this image?' },
    { type: 'image_url', image_url: { url: 'https://...' } }
  ]
}
```

**Claude Adapter** (if it existed) would convert to:
```javascript
{
  role: 'user',
  content: [
    { type: 'text', text: 'What's in this image?' },
    {
      type: 'image',
      source: { type: 'url', url: 'https://...' }
    }
  ]
}
```

#### 5. **Performance: Streaming Optimization**

**Without Adapters**:
```javascript
// ❌ Application handles streaming for each provider
if (provider === 'openai') {
  // Parse OpenAI SSE format
  const reader = response.body.getReader();
  // ... 50 lines of code
} else if (provider === 'claude') {
  // Parse Claude SSE format
  // ... different 50 lines of code
}
```

**With Adapters**:
```javascript
// ✅ Adapter handles provider-specific streaming
await adapter.generate(messages, (chunk) => {
  // Callback receives normalized chunks for all providers
  console.log(chunk); // "Sara", " is", " married", ...
});
```

### Creating a New Adapter

If you want to add support for a new provider (e.g., Anthropic Claude), here's the pattern:

**File**: `components/chats/app/service/adapters/claudeAdapter.js` (example)

```javascript
class ClaudeAdapter {
    async generate(messageHistory, onChunk, noThinking, modelConfig) {
        // 1. Extract config
        const apiKey = modelConfig.api_key;
        const modelName = modelConfig.name;

        // 2. Convert internal format → Claude format
        const claudeMessages = this._buildMessages(messageHistory);

        // 3. Build Claude-specific payload
        const payload = {
            model: modelName,
            messages: claudeMessages,
            max_tokens: modelConfig.settings.max_tokens || 1024,
            stream: true
        };

        // 4. Make request to Claude API
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // 5. Handle response
        return await this._handleStreamingResponse(res, onChunk, modelConfig);
    }

    _buildMessages(messageHistory) {
        // Convert internal format to Claude format
        return messageHistory
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({
                role: m.role,
                content: m.content
            }));
    }

    async _handleStreamingResponse(res, onChunk, modelConfig) {
        // Parse Claude SSE format
        // ...
    }
}

module.exports = ClaudeAdapter;
```

**Then update modelService.js**:
```javascript
async _generate(messageHistory, onChunk, noThinking, modelConfig) {
    const provider = modelConfig.provider.toLowerCase();

    let adapter;
    if (provider === 'claude' || provider === 'anthropic') {
        adapter = new ClaudeAdapter();
    } else {
        adapter = new OpenAIAdapter();
    }

    return await adapter.generate(messageHistory, onChunk, noThinking, modelConfig);
}
```

### Adapter Benefits Summary

| Benefit | Without Adapters | With Adapters |
|---------|-----------------|---------------|
| **Switch providers** | Rewrite 50+ files | Change 1 database field |
| **Error handling** | Different for each | Normalized |
| **Response format** | Need if/else everywhere | Always consistent |
| **Streaming** | Implement SSE parsing per provider | Handled by adapter |
| **Vision support** | Check capabilities in app code | Adapter handles it |
| **Testing** | Test with real APIs | Mock adapter |
| **Maintenance** | Changes ripple through codebase | Changes isolated to adapter |

### Code That Calls Adapters

Here's the complete call stack showing every file that touches adapters:

```
1. User sends message
   ↓
2. app/sockets/chatSocket.js:start()
   - Loads history
   - Queries RAG
   - Injects grounding
   ↓
3. app/sockets/chatSocket.js:530-558
   - Calls this.modelService._generate()
   ↓
4. components/chats/app/service/modelService.js:27-36
   - Selects adapter based on modelConfig.provider
   - Instantiates adapter
   - Calls adapter.generate()
   ↓
5. components/chats/app/service/adapters/openaiAdapter.js:17-62
   - generate() method
   - Calls _buildMessages()
   - Calls _buildPayload()
   - Makes HTTPS request
   - Calls _handleStreamingResponse()
   ↓
6. components/chats/app/service/adapters/openaiAdapter.js:68-131
   - _buildMessages() converts format
   ↓
7. components/chats/app/service/adapters/openaiAdapter.js:133-151
   - _buildPayload() adds settings
   ↓
8. components/chats/app/service/adapters/openaiAdapter.js:190-265
   - _handleStreamingResponse() processes SSE
   - Calls onChunk() callback for each token
   ↓
9. app/sockets/chatSocket.js:457-520 (tokenCallback)
   - Processes chunks
   - Sends to frontend via Socket.io
   - Saves to database
```

**Total Files Involved**: 3
- `chatSocket.js` - Orchestrator
- `modelService.js` - Router
- `openaiAdapter.js` - Implementation

**Abstraction Level**:
- `chatSocket.js` - Knows nothing about providers, only calls `modelService._generate()`
- `modelService.js` - Knows provider names, routes to adapter
- `openaiAdapter.js` - Knows OpenAI API details

This **separation of concerns** makes the system maintainable and extensible.

---

## Control Mechanism #1: Providers

### What Are Providers?

**Providers** are the abstraction layer between your application and different LLM APIs. They handle the **API-specific details** so your core application logic doesn't need to know whether it's talking to OpenAI, Anthropic, or Grok.

### Configuration

**Database Field**: `models.provider`

**Supported Values**:
- `openai` → OpenAI GPT-4, GPT-3.5, etc.
- `grok` → xAI Grok models (OpenAI-compatible)
- `anthropic` → Claude models (if adapter exists)
- `gemini` → Google Gemini (if adapter exists)
- `ollama` → Local Ollama models (if adapter exists)

### File Structure

```
components/chats/app/service/
├── modelService.js           # Routes to correct adapter
└── adapters/
    ├── openaiAdapter.js      # OpenAI-compatible APIs (OpenAI, Grok, Azure)
    ├── anthropicAdapter.js   # Claude API (if needed)
    ├── ollamaAdapter.js      # Local Ollama (if needed)
    └── geminiAdapter.js      # Google Gemini (if needed)
```

### How It Works

**File**: `components/chats/app/service/modelService.js`

```javascript
async _generate(messageHistory, onChunk, noThinking, modelConfig) {
    const provider = (modelConfig?.provider || 'openai').toLowerCase();

    console.log(`🎯 ModelService routing to provider: ${provider}`);

    // Route to correct adapter based on provider
    const adapter = new OpenAIAdapter();
    return await adapter.generate(messageHistory, onChunk, noThinking, modelConfig);
}
```

**Currently**, all providers use `OpenAIAdapter` because:
1. OpenAI's chat completions API is the industry standard
2. Grok, Azure OpenAI, and many others implement OpenAI-compatible APIs
3. You can add provider-specific adapters when needed

### What Adapters Do

Each adapter is responsible for:

1. **Request Format Conversion**
   - Your app uses internal format: `{ role: 'user', content: 'Hello' }`
   - Adapter converts to provider format (e.g., OpenAI's `messages` array)

2. **Authentication**
   - Handles API key injection
   - Manages bearer tokens
   - Handles special headers

3. **Streaming**
   - Processes Server-Sent Events (SSE)
   - Handles provider-specific chunk formats
   - Calls your `onChunk` callback

4. **Error Handling**
   - Normalizes provider-specific error codes
   - Provides consistent error messages

### Why You Need Providers

**Without Providers:**
```javascript
// ❌ Tightly coupled to OpenAI
const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model: 'gpt-4',
        messages: messages
    })
});

// If you want to use Claude, you need to rewrite everything!
```

**With Providers:**
```javascript
// ✅ Works with any provider
const adapter = this.getAdapter(modelConfig.provider);
const response = await adapter.generate(messageHistory, onChunk, noThinking, modelConfig);

// Switch providers by changing database field - no code changes!
```

---

## Control Mechanism #2: System Prompts

### What Are System Prompts?

**System prompts** define the **base personality and behavior** of the LLM. They tell the model "who you are" and "how you should behave."

### Configuration

**Database Field**: `models.system_prompt`

**Example**:
```
You are a helpful AI assistant specialized in technical documentation.
You provide clear, concise answers with code examples when relevant.
You cite sources when available and admit when you don't know something.
```

### Location in Architecture

System prompts are applied at **LAYER 2** - they form the foundation of all LLM interactions.

### How It Works

**File**: `components/chats/app/service/adapters/openaiAdapter.js:71-78`

```javascript
// Extract system message from messageHistory (which may contain RAG context)
const systemMessageFromHistory = messageHistory.find(m => m.role === 'system');
const systemPrompt = systemMessageFromHistory
    ? String(systemMessageFromHistory.content || '').trim()
    : (typeof modelConfig.system_prompt === 'string' && modelConfig.system_prompt.trim().length > 0)
        ? modelConfig.system_prompt.trim()
        : '';
```

**Priority Order**:
1. **First**: Check if `messageHistory` has a system message (may contain RAG context)
2. **Fallback**: Use `modelConfig.system_prompt` from database
3. **Default**: Empty string (no system prompt)

### When System Prompts Are Modified

System prompts can be **dynamically modified** by:

1. **RAG Grounding** (LAYER 5)
   - Injects knowledge base context
   - Adds grounding instructions
   - See [Control Mechanism #5: Grounding Modes](#control-mechanism-5-grounding-modes)

2. **Profile Rules** (LAYER 4)
   - Adds user preferences
   - Modifies tone and style
   - See [Control Mechanism #4: Profiles](#control-mechanism-4-profiles)

### Example Transformation

**Original System Prompt** (from database):
```
You are a helpful assistant.
```

**After RAG Injection**:
```
You are a helpful assistant.

--- Retrieved Knowledge Base Context ---
Sara is married to John Smith. They got married in 2018.
--- End of Retrieved Context ---

**INSTRUCTIONS:**
Answer the user's question using the information provided between the
"Retrieved Knowledge Base Context" markers above.
```

### Why You Need System Prompts

System prompts provide **consistent base behavior** across all conversations:

- **Without System Prompt**: Model behavior is unpredictable and changes with each provider
- **With System Prompt**: You define the personality, capabilities, and limitations

**Use Cases**:
- Customer service bot: "You are a friendly customer service representative..."
- Code assistant: "You are an expert programmer who writes clean, documented code..."
- Medical advisor: "You are a medical professional. Always recommend consulting a doctor..."

---

## Control Mechanism #3: Prompt Templates

### What Are Prompt Templates?

**Prompt templates** control **how messages are formatted** before being sent to the LLM. They handle provider-specific formatting requirements.

### Configuration

**Database Field**: `models.prompt_template`

**Example**:
```
<|im_start|>system
{system}
<|im_end|>
<|im_start|>user
{user}
<|im_end|>
<|im_start|>assistant
{assistant}
<|im_end|>
```

### When You Need Prompt Templates

Some models require **specific formatting tokens**:

1. **ChatML Format** (used by many open-source models)
   - `<|im_start|>role` and `<|im_end|>` markers
   - Required by GPT-3.5, some fine-tuned models

2. **Llama Format** (Meta's models)
   - `[INST]` and `[/INST]` markers
   - Required by Llama 2, Llama 3

3. **Mistral Format**
   - Special system message handling
   - Different from standard chat completion

### How It Works

**File**: `components/chats/app/service/adapters/openaiAdapter.js:83-90`

```javascript
// Try to use prompt template if available
if (templateString) {
    try {
        oaiMessages = promptTemplateService.renderToOpenAIMessages(
            templateString,
            messageHistory,
            systemPrompt  // Now contains RAG context if present
        );
    } catch (e) {
        console.error('⚠️ Template rendering failed, falling back to naive messages:', e?.message);
    }
}
```

**File**: `components/chats/app/service/promptTemplateService.js`

The `promptTemplateService` handles:
1. Parsing template strings
2. Replacing variables (`{system}`, `{user}`, `{assistant}`)
3. Applying special tokens
4. Converting to OpenAI format

### Template Variables

Common variables in templates:
- `{system}` → System prompt (including RAG context)
- `{user}` → User message content
- `{assistant}` → Assistant response
- `{history}` → Full conversation history

### Why You Need Prompt Templates

**Scenario 1: OpenAI GPT-4**
```javascript
// No template needed - standard format works
{
    role: 'system',
    content: 'You are helpful'
}
```

**Scenario 2: Llama 2**
```javascript
// Template required - needs special format
[INST] <<SYS>>
You are helpful
<</SYS>>

User message here [/INST]
```

**Scenario 3: Fine-tuned Model**
```javascript
// Custom template for your specific fine-tune
<|im_start|>system
You are helpful
<|im_end|>
<|im_start|>user
User message here
<|im_end|>
```

**Without Prompt Templates**: You'd need different adapters for each format
**With Prompt Templates**: Change template in database, code stays the same

---

## Control Mechanism #4: Profiles

### What Are Profiles?

**Profiles** store **user-level preferences** that modify LLM behavior across all conversations for that user.

### Configuration

**Database Table**: `user_profiles`

**Fields**:
- `user_id` → Links to user
- `preferences` → JSON object with settings
- `rules` → Additional prompt rules

### Common Profile Settings

```json
{
  "tone": "professional",
  "responseLength": "concise",
  "codeStyle": "verbose",
  "language": "en",
  "customInstructions": "Always explain your reasoning step by step"
}
```

### How Profiles Modify Behavior

Profiles are injected into the system prompt **before** it goes to the adapter:

```javascript
// Original system prompt
"You are a helpful assistant."

// After profile injection
"You are a helpful assistant.

User preferences:
- Tone: Professional
- Response length: Concise
- Always explain your reasoning step by step"
```

### Why You Need Profiles

**Use Cases**:

1. **Personalization**
   - User A likes detailed explanations
   - User B wants bullet points only

2. **Consistency**
   - User's preferences apply across all chats
   - No need to repeat instructions every conversation

3. **Multi-tenant Applications**
   - Different clients have different requirements
   - Profiles isolate preferences per user/organization

**Example**:
```javascript
// Without profiles - user must repeat every time
"Explain quantum computing. Use simple language. Give examples."

// With profiles - preferences remembered
"Explain quantum computing"
// System automatically adds: "Use simple language" from profile
```

---

## Control Mechanism #5: Grounding Modes

### What Is Grounding?

**Grounding** is the process of **constraining the LLM to use specific context** (like RAG documents) when answering questions. It prevents hallucination by forcing the model to cite retrieved information.

### Configuration

**Database Field**: `models.grounding_mode`

**Supported Values**:
- `strict` → Model MUST use only retrieved context, refuse if not found
- `soft` → Model SHOULD prefer retrieved context, can use general knowledge

### Why You Need Grounding

**Problem**: RAG Without Grounding
```
User: "Who is Sara married to?"
RAG System: Retrieved "Sara is married to John"
LLM Response: "As an AI, I don't have access to personal information..."
```
❌ The context was retrieved but the LLM ignored it!

**Solution**: Grounding Mode
```
User: "Who is Sara married to?"
RAG System: Retrieved "Sara is married to John"
Grounding: Inject strict instructions to use retrieved context
LLM Response: "According to the provided documents, Sara is married to John."
```
✅ The LLM is forced to use the retrieved context!

### How Grounding Works

**File**: `app/sockets/chatSocket.js:41-108`

```javascript
_injectRAGGrounding(messageHistory, ragContext, ragQueryText) {
    let hasContext = ragContext && ragContext.trim().length > 0;

    if (!hasContext) {
        console.log(`ℹ️  RAG: No context found - skipping RAG grounding`);
        return;
    }

    // Get grounding mode from model config (DB-driven)
    const groundingMode = (this.modelConfig?.grounding_mode || 'strict').toLowerCase();
    const isSoftMode = groundingMode === 'soft';

    const existingSystemPrompt = this.modelConfig.system_prompt || '';

    // Build grounding instructions based on grounding_mode
    let systemPromptWithContext;
    if (isSoftMode) {
        // Soft grounding - allows model flexibility
        systemPromptWithContext = `${existingSystemPrompt}

--- Retrieved Knowledge Base Context ---
${ragContext}
--- End of Retrieved Context ---

Use the information provided above to help answer the user's question.
If the context contains relevant information, prioritize it in your response.
If the context doesn't contain relevant information, you may use your general
knowledge but mention that the information wasn't found in the knowledge base.`;
    } else {
        // Strict grounding - forces context-only answers
        systemPromptWithContext = `${existingSystemPrompt}

--- Retrieved Knowledge Base Context ---
${ragContext}
--- End of Retrieved Context ---

**INSTRUCTIONS:**
Answer the user's question using the information provided between the
"Retrieved Knowledge Base Context" markers above.
- If the answer is present there, use it in your response.
- If it is NOT present, reply: "I don't know based on the provided documents."
- Prioritize the retrieved context over your general knowledge.`;
    }

    // Inject into message history
    const systemMsgIndex = messageHistory.findIndex(m => m.role === 'system');
    if (systemMsgIndex >= 0) {
        messageHistory[systemMsgIndex].content = systemPromptWithContext;
    } else {
        messageHistory.unshift({ role: 'system', content: systemPromptWithContext });
    }
}
```

### Strict vs Soft Grounding

#### Strict Mode (`grounding_mode: 'strict'`)

**Best For**:
- Legal documents
- Medical information
- Technical documentation
- Customer support (company-specific info)

**Behavior**:
- ✅ Will ONLY use retrieved context
- ✅ Will refuse to answer if context doesn't contain answer
- ❌ Will NOT use general knowledge
- ✅ Prevents hallucination completely

**Example**:
```
User: "What is the refund policy?"
Context Retrieved: [Company refund policy document]
Response: "According to the policy, you have 30 days for refunds..."

User: "What's the capital of France?"
Context Retrieved: [Nothing relevant]
Response: "I don't know based on the provided documents."
```

#### Soft Mode (`grounding_mode: 'soft'`)

**Best For**:
- General Q&A with knowledge base assistance
- Educational content
- Creative writing with source material
- Research assistance

**Behavior**:
- ✅ Will prefer retrieved context when available
- ✅ Will supplement with general knowledge if needed
- ✅ More natural conversation flow
- ⚠️  Small risk of hallucination

**Example**:
```
User: "What is the refund policy?"
Context Retrieved: [Company refund policy document]
Response: "According to your company policy, you have 30 days for refunds..."

User: "What's the capital of France?"
Context Retrieved: [Nothing relevant]
Response: "The capital of France is Paris. (Note: This information wasn't in
the knowledge base, so I used my general knowledge.)"
```

### When Grounding Is Applied

**Timeline**:
1. User sends message
2. RAG system queries knowledge base
3. **Grounding injection happens** (adds context + instructions)
4. Context window trimming (if needed)
5. Message sent to LLM

**Critical**: Grounding must happen AFTER trimming (see fix in `chatSocket.js:417-433`)

### Why You Need Grounding Separate from System Prompt

**Question**: "Why not just put RAG instructions in the system prompt?"

**Answer**: Because grounding is **dynamic** and **context-dependent**:

1. **Not every message needs grounding**
   - Grounding only applies when RAG context is found
   - Without context, you want normal LLM behavior

2. **Context changes per query**
   - Each user question retrieves different documents
   - Grounding instructions must reference the specific context

3. **Grounding mode can change per model**
   - Customer service bot: Strict mode
   - Research assistant: Soft mode
   - Same system prompt, different grounding behavior

**Example**:
```javascript
// System Prompt (static)
"You are a helpful customer service representative."

// Grounding (dynamic, only when RAG finds context)
+ "Here are the relevant documents: [CONTEXT]"
+ "Answer ONLY using these documents."
```

---

## How They All Work Together

### Complete Flow Example

Let's trace a single user question through all 5 layers:

**User Question**: "Who is Sara married to?"

#### Step 1: RAG Query (LAYER 5 Preparation)

```
RAG System searches knowledge base
→ Finds: "Sara is married to John Smith. They got married in 2018 in California."
→ Similarity Score: 0.89 (high match)
```

#### Step 2: Grounding Injection (LAYER 5)

**File**: `app/sockets/chatSocket.js:433`

```javascript
_injectRAGGrounding(messageHistory, ragContext, ragQueryText);
```

**Result**:
```javascript
messageHistory = [
    {
        role: 'system',
        content: `You are a helpful assistant.

--- Retrieved Knowledge Base Context ---
Sara is married to John Smith. They got married in 2018 in California.
--- End of Retrieved Context ---

**INSTRUCTIONS:**
Answer the user's question using the information provided between the
"Retrieved Knowledge Base Context" markers above.`
    },
    {
        role: 'user',
        content: 'Who is Sara married to?'
    }
]
```

#### Step 3: Profile Rules (LAYER 4)

**Assumed Profile**:
```json
{
  "tone": "professional",
  "citeSources": true
}
```

**If profiles were active** (currently not in code, but architecture supports it):
```javascript
messageHistory[0].content += "\n\nUser preferences:\n- Tone: Professional\n- Always cite sources"
```

#### Step 4: Provider Routing (LAYER 1)

**File**: `components/chats/app/service/modelService.js:27-35`

```javascript
const provider = modelConfig.provider; // "openai"
const adapter = new OpenAIAdapter();
return await adapter.generate(messageHistory, onChunk, noThinking, modelConfig);
```

#### Step 5: Message Building (LAYER 2 + LAYER 3)

**File**: `components/chats/app/service/adapters/openaiAdapter.js:68-131`

```javascript
_buildMessages(messageHistory, modelConfig) {
    // Extract system prompt from messageHistory (includes RAG context)
    const systemMessageFromHistory = messageHistory.find(m => m.role === 'system');
    const systemPrompt = systemMessageFromHistory.content;

    // Apply prompt template if configured (LAYER 3)
    if (modelConfig.prompt_template) {
        oaiMessages = promptTemplateService.renderToOpenAIMessages(
            modelConfig.prompt_template,
            messageHistory,
            systemPrompt
        );
    } else {
        // Naive conversion (LAYER 2 only)
        oaiMessages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Who is Sara married to?' }
        ];
    }

    return oaiMessages;
}
```

**Result** (OpenAI format):
```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant.\n\n--- Retrieved Knowledge Base Context ---\nSara is married to John Smith. They got married in 2018 in California.\n--- End of Retrieved Context ---\n\n**INSTRUCTIONS:**\nAnswer the user's question using the information provided..."
    },
    {
      "role": "user",
      "content": "Who is Sara married to?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2000,
  "stream": true
}
```

#### Step 6: API Request (LAYER 1)

**File**: `components/chats/app/service/adapters/openaiAdapter.js:45-49`

```javascript
const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${modelConfig.api_key}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
});
```

#### Step 7: LLM Response

```
GPT-4 receives:
- System prompt with RAG context
- Strict grounding instructions
- User question

GPT-4 responds:
"According to the provided documents, Sara is married to John Smith.
They got married in 2018 in California."
```

✅ **Success!** The LLM used the grounded context and didn't hallucinate.

### What Happens Without Each Layer?

#### Without Grounding (LAYER 5)
```
System Prompt: "You are a helpful assistant."
User: "Who is Sara married to?"
LLM: "I'm sorry, but I don't have access to personal information about
individuals unless it's publicly available information."
```
❌ RAG context retrieved but not used

#### Without System Prompt (LAYER 2)
```
User: "Who is Sara married to?"
LLM: *Unpredictable response - varies by provider*
```
❌ No consistent behavior

#### Without Prompt Template (LAYER 3)
```
// Sending to Llama 2 without proper format
{ role: 'system', content: '...' }
```
❌ Llama 2 doesn't understand OpenAI format - garbage output

#### Without Provider Abstraction (LAYER 1)
```javascript
// Hardcoded to OpenAI
fetch('https://api.openai.com/v1/chat/completions', ...)
```
❌ Can't switch to Claude or Grok without rewriting code

#### Without Profiles (LAYER 4)
```
User must repeat preferences every conversation:
"Explain this. Use simple language. Be concise. Give examples."
```
❌ Annoying for users, inconsistent experience

---

## File Architecture & Flow

### Complete File Map

```
📦 bookbag-ce/
│
├── 📁 app/
│   ├── 📁 sockets/
│   │   └── 📄 chatSocket.js                 ⭐ MAIN ORCHESTRATOR
│   │       ├── start()                       → Entry point for chat messages
│   │       ├── _injectRAGGrounding()         → LAYER 5: Grounding injection
│   │       └── Calls modelService._generate()
│   │
│   └── 📁 service/
│       └── 📄 errorService.js                → Error normalization
│
├── 📁 components/
│   ├── 📁 chats/
│   │   └── 📁 app/
│   │       ├── 📁 service/
│   │       │   ├── 📄 modelService.js        ⭐ PROVIDER ROUTER (LAYER 1)
│   │       │   │   └── _generate()           → Routes to correct adapter
│   │       │   │
│   │       │   ├── 📄 promptTemplateService.js  ⭐ TEMPLATE PROCESSOR (LAYER 3)
│   │       │   │   └── renderToOpenAIMessages() → Applies templates
│   │       │   │
│   │       │   ├── 📄 chatHistoryService.js     → Load/save messages
│   │       │   ├── 📄 messagePersistenceService.js → Database operations
│   │       │   └── 📄 responseNormalizationService.js → Image extraction
│   │       │
│   │       └── 📁 adapters/
│   │           └── 📄 openaiAdapter.js       ⭐ PROVIDER ADAPTER (LAYER 1)
│   │               ├── generate()            → Main entry point
│   │               ├── _buildMessages()      → LAYER 2: System prompt extraction
│   │               │                         → LAYER 3: Template application
│   │               ├── _buildPayload()       → Add settings (temperature, etc)
│   │               └── _handleStreamingResponse() → Process SSE chunks
│   │
│   ├── 📁 rag/
│   │   └── 📁 app/
│   │       ├── 📁 service/
│   │       │   └── 📄 ragService.js          → Query knowledge base
│   │       └── 📁 models/
│   │           └── 📄 ragContext.js          → Database models
│   │
│   └── 📁 models/
│       └── 📁 app/
│           └── 📁 service/
│               └── 📄 llmConfigService.js    → Load model configs from DB
│
└── 📁 database/
    └── 📁 tables/
        ├── 📄 models.json                    → model configs (provider, system_prompt, etc)
        ├── 📄 chats.json                     → chat sessions
        ├── 📄 messages.json                  → message history
        └── 📄 user_profiles.json             → user preferences (LAYER 4)
```

### Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  1. User sends message via Socket.io                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. chatSocket.start() - app/sockets/chatSocket.js              │
│     ├── Load chat history                                       │
│     ├── Query RAG system (ragService.queryRAG)                  │
│     ├── Inject grounding (LAYER 5)                              │
│     └── Trim context window                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. modelService._generate() - service/modelService.js          │
│     └── Route to adapter based on model.provider (LAYER 1)      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. openaiAdapter.generate() - adapters/openaiAdapter.js        │
│     ├── _buildMessages()                                        │
│     │   ├── Extract system prompt from history (LAYER 2)        │
│     │   └── Apply prompt template if configured (LAYER 3)       │
│     ├── _buildPayload()                                         │
│     └── Make HTTPS request to LLM API                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. LLM API (OpenAI, Grok, Claude, etc.)                        │
│     └── Returns streaming response (SSE)                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. openaiAdapter._handleStreamingResponse()                    │
│     └── Process chunks, call onChunk callback                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. chatSocket.start() tokenCallback                            │
│     ├── Process thinking sections                               │
│     ├── Send chunks to frontend via Socket.io                   │
│     └── Save to database (messagePersistenceService)            │
└─────────────────────────────────────────────────────────────────┘
```

### Critical Functions Reference

#### chatSocket.js

```javascript
// Line 41-108
_injectRAGGrounding(messageHistory, ragContext, ragQueryText)
// Purpose: Inject RAG context with grounding instructions (LAYER 5)
// Called: After RAG query, before sending to model
// Modifies: messageHistory[0] (system message)

// Line 111-680
async start(data, socket)
// Purpose: Main orchestrator for chat streaming
// Flow:
//   1. Load chat history
//   2. Query RAG if enabled
//   3. Inject grounding
//   4. Trim context
//   5. Call model
//   6. Stream response
//   7. Save to DB
```

#### modelService.js

```javascript
// Line 27-36
async _generate(messageHistory, onChunk, noThinking, modelConfig)
// Purpose: Route to correct provider adapter (LAYER 1)
// Input: messageHistory (with RAG context injected)
// Output: Streaming response
// Routes: Based on modelConfig.provider
```

#### openaiAdapter.js

```javascript
// Line 17-62
async generate(messageHistory, onChunk, noThinking, modelConfig)
// Purpose: Main entry point for OpenAI-compatible generation
// Flow:
//   1. Build messages (_buildMessages)
//   2. Build payload (_buildPayload)
//   3. Make API request
//   4. Handle response

// Line 68-131
_buildMessages(messageHistory, modelConfig)
// Purpose: Convert internal format to OpenAI format (LAYER 2 + 3)
// Critical: Extracts system message from messageHistory (RAG context)
// Flow:
//   1. Find system message in messageHistory
//   2. Apply prompt template if configured
//   3. Convert attachments to vision format
//   4. Return OpenAI-formatted messages

// Line 133-151
_buildPayload(modelName, messages, settings)
// Purpose: Add model settings to request
// Adds: temperature, max_tokens, top_p, etc.

// Line 190-265
async _handleStreamingResponse(res, onChunk, modelConfig)
// Purpose: Process SSE stream from API
// Flow:
//   1. Read chunks from response body
//   2. Parse SSE format
//   3. Extract content deltas
//   4. Call onChunk callback
//   5. Return final response
```

---

## Real-World Examples

### Example 1: Customer Service Bot (Strict Grounding)

**Goal**: Answer customer questions using only company documentation.

**Configuration**:
```json
{
  "provider": "openai",
  "model": "gpt-4",
  "system_prompt": "You are a helpful customer service representative for TechCorp.",
  "grounding_mode": "strict",
  "prompt_template": null,
  "settings": {
    "temperature": 0.3,
    "max_tokens": 500
  }
}
```

**Scenario**:
```
User: "What's your refund policy?"

RAG Query: Finds company policy document
RAG Context: "TechCorp offers 30-day money-back guarantee on all products..."

Grounding Injection (strict):
"Answer ONLY using the retrieved context. If answer not found, say you don't know."

LLM Response:
"According to our policy, TechCorp offers a 30-day money-back guarantee on all
products. To initiate a refund, please contact support@techcorp.com with your
order number."
```

✅ **Result**: Accurate, company-specific answer. No hallucination.

### Example 2: Research Assistant (Soft Grounding)

**Goal**: Help users with research, supplement with general knowledge when needed.

**Configuration**:
```json
{
  "provider": "openai",
  "model": "gpt-4",
  "system_prompt": "You are a research assistant. Help users understand complex topics.",
  "grounding_mode": "soft",
  "prompt_template": null,
  "settings": {
    "temperature": 0.7,
    "max_tokens": 2000
  }
}
```

**Scenario**:
```
User: "Explain quantum entanglement"

RAG Query: Finds research paper about quantum entanglement
RAG Context: "Quantum entanglement occurs when particles become correlated..."

Grounding Injection (soft):
"Use the retrieved context when available. You may supplement with general
knowledge if helpful."

LLM Response:
"Based on the research paper provided, quantum entanglement occurs when
particles become correlated in ways that cannot be explained by classical physics.
Let me expand on this: When two particles are entangled, measuring one
instantly affects the other, regardless of distance. This phenomenon, which
Einstein famously called 'spooky action at a distance,' is now used in quantum
computing and cryptography."
```

✅ **Result**: Uses RAG context as foundation, supplements with explanatory content.

### Example 3: Code Generation (No Grounding)

**Goal**: Generate code based on user requirements.

**Configuration**:
```json
{
  "provider": "openai",
  "model": "gpt-4",
  "system_prompt": "You are an expert programmer. Write clean, well-documented code.",
  "grounding_mode": null,
  "prompt_template": null,
  "settings": {
    "temperature": 0.2,
    "max_tokens": 4000
  }
}
```

**Scenario**:
```
User: "Write a Python function to calculate Fibonacci numbers"

RAG Query: Not performed (no knowledge base needed)
Grounding: Not applied

LLM Response:
"Here's a Python function to calculate Fibonacci numbers:

```python
def fibonacci(n):
    """
    Calculate the nth Fibonacci number.

    Args:
        n (int): Position in Fibonacci sequence

    Returns:
        int: The nth Fibonacci number
    """
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return fibonacci(n-1) + fibonacci(n-2)
```

This uses recursion for simplicity. For better performance with large n,
consider using dynamic programming."
```

✅ **Result**: Pure code generation, no grounding needed.

### Example 4: Multi-Tenant SaaS (Profile-Based)

**Goal**: Different behavior for different organizations.

**Configuration** (Organization A):
```json
{
  "provider": "openai",
  "model": "gpt-4",
  "system_prompt": "You are a helpful assistant.",
  "profile_rules": "Always use formal tone. Cite sources. Be brief.",
  "grounding_mode": "strict"
}
```

**Configuration** (Organization B):
```json
{
  "provider": "openai",
  "model": "gpt-4",
  "system_prompt": "You are a helpful assistant.",
  "profile_rules": "Use friendly tone. Give detailed explanations. Use examples.",
  "grounding_mode": "soft"
}
```

**Same Question, Different Responses**:

**Org A**:
```
User: "What is machine learning?"
Response: "Machine learning is a subset of AI that enables systems to learn
from data without explicit programming. Source: Company ML Guide, Section 2.1."
```

**Org B**:
```
User: "What is machine learning?"
Response: "Hey! Great question! Machine learning is like teaching a computer
to learn from examples instead of programming every rule. Think of it like
teaching a kid to recognize cats - you show them lots of cat pictures, and
eventually they figure out what makes a cat a cat! Let me give you a concrete
example: When Netflix recommends shows you might like, that's machine learning
analyzing your viewing history..."
```

✅ **Result**: Same system, personalized experience per organization.

---

## Troubleshooting Guide

### Issue 1: RAG Context Ignored (LLM Hallucinates)

**Symptoms**:
```
RAG logs show: "✅ RAG: Found 4 relevant chunks"
LLM responds: "I don't have access to that information"
```

**Diagnosis**:
```bash
# Check if grounding is being applied
grep "RAG: Context injected" logs.txt

# Check if message history has system message before generate
grep "FINAL MESSAGE HISTORY BEFORE GENERATE" logs.txt
```

**Possible Causes**:

1. **Grounding mode is null/disabled**
   - Check: `models.grounding_mode` in database
   - Fix: Set to `strict` or `soft`

2. **RAG injection happens before trimming**
   - Check: Order of operations in `chatSocket.js`
   - Fix: Ensure grounding happens AFTER `manageContextWindow()`

3. **Adapter ignores messageHistory system message**
   - Check: `openaiAdapter.js:_buildMessages()`
   - Fix: Extract system prompt from `messageHistory`, not `modelConfig.system_prompt`

4. **Prompt template overrides system message**
   - Check: Does model have `prompt_template` set?
   - Fix: Ensure template uses `{system}` variable

### Issue 2: Wrong Provider Being Used

**Symptoms**:
```
Expected: Grok response
Got: OpenAI format error
```

**Diagnosis**:
```bash
# Check provider routing
grep "ModelService routing to provider" logs.txt
```

**Possible Causes**:

1. **Wrong provider in database**
   - Check: `models.provider` field
   - Values: `openai`, `grok`, `anthropic`

2. **Provider adapter doesn't exist**
   - Check: Does `adapters/{provider}Adapter.js` exist?
   - Fix: Create adapter or use `openai` for compatible APIs

3. **Provider misconfiguration**
   - Check: `models.server_url` and `models.api_key`
   - Fix: Ensure correct endpoints (e.g., `https://api.x.ai/v1/` for Grok)

### Issue 3: Prompt Template Not Applied

**Symptoms**:
```
Expected: <|im_start|> format
Got: Regular OpenAI format
```

**Diagnosis**:
```bash
# Check template rendering
grep "Template rendering" logs.txt
```

**Possible Causes**:

1. **Template is null/empty in database**
   - Check: `models.prompt_template`
   - Fix: Set template string or leave null for standard format

2. **Template has syntax errors**
   - Error: `⚠️ Template rendering failed`
   - Fix: Check template syntax, ensure variables exist

3. **Template not compatible with model**
   - Some models don't support custom templates
   - Fix: Leave `prompt_template` null for standard models

### Issue 4: System Prompt Not Working

**Symptoms**:
```
System prompt: "Be concise"
LLM gives long responses
```

**Possible Causes**:

1. **System prompt being overwritten by RAG**
   - RAG injection replaces entire system message
   - Fix: Expected behavior - RAG adds to system prompt

2. **Model doesn't follow system prompts well**
   - Some models ignore system messages
   - Fix: Use grounding mode to enforce behavior

3. **Temperature too high**
   - High temperature → more creative/unpredictable
   - Fix: Lower `settings.temperature` to 0.1-0.3

### Issue 5: Grounding Too Strict/Soft

**Symptoms**:
```
Strict mode: "I don't know" for questions with obvious answers
Soft mode: Hallucinating despite RAG context
```

**Solutions**:

**Too Strict**:
```json
{
  "grounding_mode": "soft",
  "system_prompt": "Prefer the knowledge base, but use general knowledge for
                    basic facts like capitals, dates, common knowledge."
}
```

**Too Soft**:
```json
{
  "grounding_mode": "strict",
  "system_prompt": "You MUST use only the retrieved documents. Do not use
                    general knowledge under any circumstances."
}
```

### Issue 6: Context Window Exceeded

**Symptoms**:
```
Error: "This model's maximum context length is 4096 tokens"
```

**Solutions**:

1. **Enable auto-trimming**
   ```sql
   UPDATE models SET auto_trim_on = true WHERE id = ?
   ```

2. **Reduce context size**
   - Limit RAG results: `k=3` instead of `k=10`
   - Shorten system prompt
   - Clear old messages

3. **Increase model context**
   ```sql
   UPDATE models SET context_size = 8192 WHERE id = ?
   ```

### Issue 7: Different Behavior on Localhost vs Server

**Symptoms**:
```
Localhost: RAG works perfectly
Server: RAG ignored
```

**Common Causes**:

1. **Different model configurations**
   - Localhost: Development DB
   - Server: Production DB
   - Fix: Sync `models` table

2. **Different environment variables**
   - Check: `.env` files differ
   - Fix: Ensure `NEXT_PUBLIC_BACKEND_URL` correct

3. **Database out of sync**
   - Check: `models.grounding_mode` on server
   - Fix: Run database migration

### Debug Checklist

When debugging LLM issues, check in this order:

```
□ 1. Provider Configuration
    □ models.provider is correct
    □ models.server_url is reachable
    □ models.api_key is valid

□ 2. System Prompt
    □ models.system_prompt is set
    □ Not being overwritten unexpectedly

□ 3. Prompt Template
    □ models.prompt_template is null OR valid syntax
    □ Compatible with chosen model

□ 4. Grounding Mode
    □ models.grounding_mode is 'strict' or 'soft'
    □ RAG context being injected
    □ Injection happens AFTER context trimming

□ 5. Message History
    □ system message present in messageHistory
    □ RAG context visible in system message
    □ Not being stripped by adapter

□ 6. Adapter Logic
    □ _buildMessages() extracts from messageHistory
    □ Not using modelConfig.system_prompt directly
    □ Template rendering working (if used)

□ 7. API Request
    □ Request payload has correct format
    □ system message in payload
    □ RAG context visible in system message
```

---

## Summary: Why You Need All 5 Layers

### Analogy: Building a House

**LAYER 1: Providers** = **Foundation**
- Different soil types (APIs) need different foundations
- You don't rebuild the house when ground changes
- Foundation abstracts the complexity below

**LAYER 2: System Prompts** = **Blueprint**
- Defines the structure and purpose
- Consistent across all rooms (conversations)
- Can be modified with additions (RAG, profiles)

**LAYER 3: Prompt Templates** = **Building Codes**
- Some jurisdictions (models) require specific formats
- Compliance with local regulations (model requirements)
- Same house, different paperwork

**LAYER 4: Profiles** = **Interior Design**
- Different families (users) have different preferences
- Personalization without changing structure
- One house, many styles

**LAYER 5: Grounding** = **Property Lines**
- Defines boundaries (what LLM can/cannot do)
- Prevents trespassing (hallucination)
- Dynamic based on context (RAG results)

### Without Each Layer

| Missing Layer | Problem | Impact |
|--------------|---------|--------|
| **No Providers** | Hardcoded to one API | Cannot switch LLMs without code changes |
| **No System Prompts** | Inconsistent behavior | LLM personality changes randomly |
| **No Templates** | Wrong format for model | Some models won't work at all |
| **No Profiles** | One-size-fits-all | Users must repeat preferences every time |
| **No Grounding** | RAG context ignored | LLM hallucinates despite having correct data |

### The Power of Layered Architecture

**Scenario**: Your company switches from OpenAI to Anthropic Claude

**Without Layers** (weeks of work):
```javascript
// Rewrite every API call
- fetch('https://api.openai.com/v1/chat/completions')
+ fetch('https://api.anthropic.com/v1/messages')

// Change request format
- { messages: [...] }
+ { prompt: "Human: ...\n\nAssistant:", ... }

// Change response parsing
- data.choices[0].message.content
+ data.completion

// Update error handling
// Update streaming logic
// Update everywhere model is called
```

**With Layers** (5 minutes):
```sql
-- Just change one database field
UPDATE models
SET provider = 'anthropic',
    server_url = 'https://api.anthropic.com/v1/',
    api_key = 'sk-ant-...'
WHERE id = 1;
```

**That's it.** All 5 layers adapt automatically.

---

## Conclusion

The BookBag CE LLM architecture uses **5 independent but complementary layers** to give you complete control over LLM behavior:

1. **Providers** (LAYER 1) - Abstract API differences
2. **System Prompts** (LAYER 2) - Define base behavior
3. **Prompt Templates** (LAYER 3) - Format for specific models
4. **Profiles** (LAYER 4) - User-level preferences
5. **Grounding Modes** (LAYER 5) - Control RAG context usage

Each layer serves a specific purpose and operates independently. Together, they create a flexible, maintainable, and powerful system that works with any LLM provider while giving you fine-grained control over every aspect of the conversation.

The architecture follows the **principle of separation of concerns**:
- API abstraction separated from business logic
- Static configuration separated from dynamic context
- User preferences separated from system behavior
- Format requirements separated from content

This makes the system:
- ✅ **Maintainable**: Change one layer without affecting others
- ✅ **Testable**: Test each layer independently
- ✅ **Scalable**: Add new providers/features without rewriting
- ✅ **Flexible**: Mix and match configurations per use case

**Remember**: You don't always need all layers active. The architecture supports:
- RAG without profiles
- Profiles without RAG
- Templates without grounding
- Any combination that fits your use case

The goal is **maximum control with minimum complexity**.

---

**Questions?** See the code references in each section or check the troubleshooting guide.

**Version History**:
- 1.0 (2025-10-19): Initial documentation
