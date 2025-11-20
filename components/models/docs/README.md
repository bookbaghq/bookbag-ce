# Models Component Documentation

Comprehensive LLM (Large Language Model) configuration and management system for Bookbag CE.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Integration](#integration)
- [Related Documentation](#related-documentation)

---

## Overview

The Models component provides complete LLM configuration, profile management, and provider integration for Bookbag CE. It handles model metadata, dynamic configuration fields, API key storage, and provider-specific integrations (OpenAI, Grok, vLLM servers). The component serves as the abstraction layer between the chat system and various LLM providers.

**Component Path:** `components/models/`
**API Prefix:** `/bb-models/api/`
**Database Context:** `modelContext`
**Storage Location:** `db/development.sqlite3`

---

## Key Features

### Model Management
- **Model Registry** - Centralized catalog of all available LLMs
- **Model Creation** - Add custom models (vLLM, OpenAI-compatible servers)
- **Model Updates** - Modify model configurations and settings
- **Model Publishing** - Control visibility in chat UI
- **Model Deletion** - Remove models with cascade cleanup
- **Provider Support** - OpenAI, Grok, Anthropic, custom vLLM servers

### Profile-Based Configuration
- **Configuration Profiles** - Reusable configuration templates
- **Field Inheritance** - Models inherit profile configurations
- **Dynamic Fields** - Define custom configuration fields
- **Field Types** - string, text, float, number, boolean, json, range
- **Field Validation** - Range constraints and type checking
- **Model Overrides** - Per-model configuration overrides

### Advanced Features
- **Stop Sequences** - Configure generation stop tokens
- **Thinking Mode** - Extended thinking markers (Claude, etc.)
- **Prompt Templates** - Reusable message formatting templates
- **Auto-Trimming** - Automatic context window management
- **Grounding Modes** - Strict or soft grounding
- **Configuration Resolution** - Merge profiles with overrides
- **Type Coercion** - Smart type conversion for field values

### Provider Integration
- **OpenAI Integration** - List and install OpenAI models
- **Grok Integration** - List and install Grok models
- **API Key Management** - Store provider API keys
- **Custom Servers** - Support for self-hosted vLLM servers
- **Base URL Configuration** - Custom API endpoints

### Settings Management
- **Global API Keys** - Store OpenAI and Grok API keys
- **Model Defaults** - System-wide default configurations
- **CPU Detection** - Auto-detect CPU cores for vLLM

---

## Architecture

### Component Structure

```
components/models/
├── app/
│   ├── controllers/
│   │   └── api/
│   │       ├── modelsController.js             # Core model CRUD
│   │       ├── profilesController.js           # Profile management
│   │       ├── profileFieldRulesController.js  # Field rules CRUD
│   │       ├── settingsController.js           # API key storage
│   │       ├── promptTemplatesController.js    # Template listing
│   │       ├── stopStringsController.js        # Stop sequences
│   │       ├── thinkingController.js           # Thinking markers
│   │       ├── oaController.js                 # OpenAI integration
│   │       └── grokController.js               # Grok integration
│   ├── models/
│   │   ├── modelContext.js                     # Database context
│   │   ├── model.js                            # Model entity
│   │   ├── profiles.js                         # Profile entity
│   │   ├── profileFieldRules.js                # Field rule entity
│   │   ├── settings.js                         # Settings entity
│   │   ├── stopStrings.js                      # Stop sequence entity
│   │   ├── startThinkingStrings.js             # Thinking marker entity
│   │   ├── modelOverrides.js                   # Override entity
│   │   ├── promptTemplates.js                  # Template entity
│   │   └── db/
│   │       └── migrations/
│   │           └── 1759119178878_Init_migration.js
│   ├── service/
│   │   └── llmConfigService.js                 # Config resolution
│   └── vm/
│       └── promptTemplates.js                  # Template view model
├── config/
│   ├── routes.js                               # Route definitions
│   └── environments/
│       ├── env.development.json
│       └── env.production.json
└── db/
    └── development.sqlite3                     # SQLite database
```

### Configuration Resolution Flow

```
┌─────────────┐
│ Chat System │
│   Request   │
└──────┬──────┘
       │
       ↓
┌──────────────────────┐
│  llmConfigService    │ ← getModelConfig(modelId)
│  (Main Entry)        │ ← Accept ID or name string
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│  Load Model + Profile│ ← Query Model by ID
│                      │ ← Load related Profile
└──────┬───────────────┘ ← Fetch ProfileFieldRules
       │
       ↓
┌──────────────────────┐
│ Load ModelOverrides  │ ← Get per-model overrides
│  (per field)         │ ← Check StopStrings
└──────┬───────────────┘ ← Check StartThinkingStrings
       │
       ↓
┌──────────────────────┐
│  Merge Configuration │ ← Defaults from ProfileFieldRules
│  (Override Priority) │ ← Apply ModelOverrides
└──────┬───────────────┘ ← Type coercion by field_type
       │
       ↓
┌──────────────────────┐
│  Return Config Obj   │
│ { id, name, ...      │
│   settings: {...}    │
│   provider, ...  }   │
└──────────────────────┘
```

### Data Relationships

```
┌────────────┐
│  Profile   │ (e.g., "OpenAI")
└─────┬──────┘
      │ has many
      ↓
┌──────────────────┐
│ProfileFieldRules │ (e.g., temperature: 0.0-2.0)
└──────┬───────────┘
       │ defines schema for
       ↓
┌────────────┐       ┌──────────────┐
│   Model    │──────→│ModelOverrides│ (per-model values)
└─────┬──────┘       └──────┬───────┘
      │                     │ has many
      │ has many            ↓
      ↓              ┌──────────────┐
┌──────────────────┐│  StopStrings │
│StartThinkingStr. │└──────────────┘
└──────────────────┘

┌──────────────────┐
│PromptTemplates   │ (standalone, referenced by models)
└──────────────────┘

┌──────────────────┐
│    Settings      │ (singleton, global API keys)
└──────────────────┘
```

### Profile Inheritance Pattern

```
Profile: "OpenAI"
  └── ProfileFieldRules:
      ├── temperature (default: 0.7, range: 0.0-2.0)
      ├── max_tokens (default: 2048, range: 1-4096)
      └── top_p (default: 1.0, range: 0.0-1.0)

Model: "gpt-4o" (profile_id: 1)
  └── ModelOverrides:
      └── temperature → 0.9  (overrides 0.7)

Effective Config for "gpt-4o":
  - temperature: 0.9     (from ModelOverrides)
  - max_tokens: 2048     (from ProfileFieldRules)
  - top_p: 1.0           (from ProfileFieldRules)
```

---

## Quick Start

### Get Published Models (for Chat UI)

```javascript
// Frontend - Get models visible to users
const response = await fetch('/bb-models/api/models/published');
const data = await response.json();

console.log('Available models:', data.models);
// [
//   {
//     id: 1,
//     name: 'gpt-4o',
//     description: 'GPT-4 Optimized',
//     profile: { name: 'OpenAI', ... },
//     is_published: true
//   }
// ]
```

### Create a Model

```javascript
// Admin - Create new vLLM server model
const response = await fetch('/bb-models/api/models/create-vllm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'llama-2-7b',
    description: 'LLaMA 2 7B model',
    profileId: 1,
    server_url: 'http://localhost:8000/v1',
    context_size: 4096,
    provider: 'openai',  // OpenAI-compatible API
    grounding_mode: 'strict'
  })
});

const data = await response.json();
console.log('Model created:', data.model);
```

### Get Model Configuration (for Chat System)

```javascript
// Backend - Resolve model config for generation
const LLMConfigService = require('components/models/app/service/llmConfigService');
const llmConfigService = new LLMConfigService();

// By ID or name
const config = await llmConfigService.getModelConfig(modelId);

console.log('Resolved config:', config);
// {
//   id: 1,
//   name: 'gpt-4o',
//   server_url: 'https://api.openai.com/v1',
//   api_key: 'sk-...',
//   provider: 'openai',
//   context_size: 128000,
//   settings: {
//     temperature: 0.7,
//     max_tokens: 2048,
//     top_p: 1.0
//   }
// }
```

### Install OpenAI Model

```javascript
// Admin - Install model from OpenAI
const response = await fetch('/bb-models/api/oa/install', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    modelName: 'gpt-4o',
    profileId: 1
  })
});

const data = await response.json();
console.log('OpenAI model installed:', data.model);
```

### Save Configuration Overrides

```javascript
// Admin - Override model settings
const response = await fetch('/bb-models/api/profiles/overrides/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    modelId: 1,
    overrides: [
      {
        field_name: 'temperature',
        value: '0.9'
      },
      {
        field_name: 'max_tokens',
        value: '4096'
      }
    ]
  })
});

const data = await response.json();
console.log('Overrides saved:', data.success);
```

---

## Core Concepts

### Profile-Based Configuration

**Why Profiles?**
Profiles provide reusable configuration templates that prevent duplication across similar models.

**Example Scenario:**
- You have 5 OpenAI models (gpt-4o, gpt-4-turbo, gpt-3.5-turbo, etc.)
- All share common parameters: temperature, max_tokens, top_p, frequency_penalty
- Instead of defining these fields 5 times, create one "OpenAI" profile
- All models inherit the profile's field definitions
- Override specific values per-model as needed

**Profile Structure:**
```javascript
Profile: {
  id: 1,
  name: "OpenAI",
  description: "OpenAI models configuration"
}

ProfileFieldRules (for Profile 1):
  - temperature: float, default: 0.7, range: 0.0-2.0
  - max_tokens: number, default: 2048, range: 1-4096
  - top_p: float, default: 1.0, range: 0.0-1.0
```

### Configuration Field Types

The component supports 7 field types:

1. **string** - Short text (e.g., "gpt-4o")
2. **text** - Long text (e.g., system prompt)
3. **float** - Decimal number (e.g., 0.7, 1.5)
4. **number / integer** - Whole number (e.g., 2048)
5. **boolean** - true/false (e.g., auto_trim_on)
6. **json** - JSON object (e.g., `{"key": "value"}`)
7. **range** - Numeric with constraints (e.g., 0.0-1.0)

**Type Coercion:**
The `llmConfigService` automatically converts string values to their proper types:
```javascript
// Stored as string in database: "0.7"
// Resolved as float: 0.7

// Stored as string: "true"
// Resolved as boolean: true

// Stored as string: "[1,2,3]"
// Resolved as array: [1, 2, 3]
```

### Model Overrides Pattern

**Inheritance:**
- Models inherit all field definitions from their profile
- Default values come from ProfileFieldRules
- ModelOverrides provide per-model customization

**Override Priority:**
```
ModelOverrides > ProfileFieldRules > System Defaults
```

**Example:**
```javascript
// ProfileFieldRule for "OpenAI" profile
{
  name: "temperature",
  default_value: "0.7"
}

// Model "gpt-4o" with override
ModelOverride {
  model_id: 1,
  profile_field_rule_id: 5,
  value: "0.9"
}

// Resolved value: 0.9 (override takes precedence)
```

### Provider Detection

The component supports multiple LLM providers:

**Supported Providers:**
- `openai` - OpenAI API (default)
- `grok` - Grok (xAI) API
- `anthropic` - Claude API
- Custom vLLM servers (OpenAI-compatible)

**Auto-Detection:**
If `provider` is not specified, it's auto-detected from `server_url`:
```javascript
// server_url: "https://api.x.ai/v1" → provider: "grok"
// server_url: "https://api.anthropic.com/v1" → provider: "anthropic"
// server_url: "https://api.openai.com/v1" → provider: "openai"
// server_url: "http://localhost:8000/v1" → provider: "openai" (default)
```

### Grounding Modes

**Grounding** controls how the model handles context and responses:

1. **strict** - Strict adherence to provided context (default for OpenAI)
2. **soft** - More flexible responses, can draw from training data (default for Grok)

### Stop Strings

**Stop sequences** tell the model when to stop generating:

```javascript
// Common stop strings
[
  "\n\nHuman:",
  "\n\nAssistant:",
  "<|endoftext|>",
  "[END]"
]
```

**Implementation:**
- Stored separately in `StopStrings` table
- Linked to `ModelOverrides` for specific fields
- Resolved as array during config resolution

### Thinking Strings

**Thinking mode** enables extended reasoning (e.g., Claude's thinking):

```javascript
{
  model_id: 1,
  start_word: "<thinking>",
  end_word: "</thinking>"
}
```

When present, the chat system can:
- Detect thinking sections in responses
- Display them separately in UI
- Track thinking token usage

### Prompt Templates

**Templates** format messages for different providers:

**GPT Format (JSON Array):**
```json
[
  {"role": "system", "content": "{{systemPrompt}}"},
  {"role": "user", "content": "{{userMessage}}"}
]
```

**Grok Format (Text):**
```
System: {{systemPrompt}}

User: {{userMessage}}