# Media Component Documentation

Comprehensive file upload, storage, and media management system for Bookbag CE.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Integration](#integration)
- [Related Documentation](#related-documentation)

---

## Overview

The Media component provides a complete file and image management system for Bookbag CE. It handles file uploads, storage, serving, and tracking with full database integration. The component supports standard file uploads, image serving for LLM vision APIs, image analysis with OpenAI/Grok, and saving AI-generated images.

**Component Path:** `components/media/`
**API Prefix:** `/bb-media/api/media/`
**Database Context:** `mediaContext`
**Storage Location:** `bb-storage/media/`

---

## Key Features

### File Management
- **File Upload** - Upload any file type with size validation
- **Image Upload** - Upload images specifically for LLM vision/analysis
- **File Serving** - Serve images via public URLs
- **File Deletion** - Remove files from storage and database
- **Search & Listing** - Paginated file listing and search

### Storage Management
- **Storage Quotas** - Configurable storage limits (MB)
- **Storage Statistics** - Real-time storage usage tracking
- **Storage Validation** - Prevent uploads exceeding quota
- **File Size Tracking** - Accurate file size calculations

### LLM Integration
- **Image Analysis** - Analyze images using OpenAI/Grok vision APIs
- **Generated Image Saving** - Save AI-generated images (URL or base64)
- **Image Linking** - Link images to chats and messages
- **Unsent Image Tracking** - Track images uploaded but not yet sent

### Database Tracking
- **MediaFile Records** - Track all uploaded files
- **Chat/Message Linking** - Associate files with chats and messages
- **Upload Source Tracking** - Track where files came from (admin, client, LLM)
- **User Attribution** - Track which user uploaded each file

---

## Architecture

### Component Structure

```
components/media/
├── app/
│   ├── controllers/
│   │   └── api/
│   │       └── mediaController.js      # API endpoints
│   ├── models/
│   │   ├── mediaContext.js             # Database context
│   │   ├── MediaFile.js                # File entity model
│   │   ├── MediaSettings.js            # Settings entity model
│   │   └── db/
│   │       └── migrations/
│   │           └── 1760328447543_Init_migration.js
│   └── service/
│       └── mediaService.js             # File operations service
├── config/
│   ├── routes.js                       # Route definitions
│   └── environments/
│       ├── env.development.json
│       └── env.production.json
├── db/
│   └── development.sqlite3             # SQLite database
└── docs/
    ├── README.md                       # This file
    ├── API.md                          # API documentation
    ├── DATABASE.md                     # Database schema
    └── STORAGE.md                      # Storage management
```

### Request Flow

```
┌─────────────┐
│   Client    │
│  (Upload)   │
└──────┬──────┘
       │
       ↓
┌──────────────────────┐
│  MasterController    │
│     (Router)         │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│  mediaController.js  │ ← Validates storage limits
│  (uploadFile)        │ ← Generates unique filename
└──────┬───────────────┘ ← Creates database record
       │
       ↓
┌──────────────────────┐
│  mediaService.js     │ ← Saves file to disk
│  (saveFile)          │ ← Moves from temp to storage
└──────┬───────────────┘ ← Returns file path
       │
       ↓
┌──────────────────────┐
│  mediaContext        │
│  (MediaFile)         │ ← Saves to database
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│   Response           │
│  { success, file }   │
└──────────────────────┘
```

### Data Flow

1. **Upload** → Controller validates storage limit
2. **Temporary Storage** → File saved to temp directory
3. **Permanent Storage** → MediaService moves file to permanent location
4. **Database Record** → MediaFile record created with metadata
5. **Response** → File ID and URL returned to client

---

## Directory Structure

### Storage Directory

```
bb-storage/
└── media/
    ├── 1731234567890-abc123def456.png
    ├── 1731234590123-789xyz012345.jpg
    └── 1731234612345-456uvw789abc.pdf
```

**Naming Convention:** `{timestamp}-{randomString}.{extension}`

### Database

- **Development:** `components/media/db/development.sqlite3`
- **Production:** Configured via environment variables

---

## Quick Start

### Basic File Upload

```javascript
// Frontend - Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('source', 'admin'); // or 'client', 'api'

const response = await fetch('/bb-media/api/media/upload', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log('File uploaded:', data.file);
// {
//   id: 123,
//   filename: 'myfile.pdf',
//   storedFilename: '1731234567890-abc123def456.pdf',
//   mimeType: 'application/pdf',
//   fileSize: 1024000,
//   formattedSize: '1000 KB',
//   createdAt: '1731234567890'
// }
```

### Upload Image for Vision

```javascript
// Upload image for LLM analysis
const formData = new FormData();
formData.append('image', imageFile);
formData.append('source', 'client');
formData.append('chatId', chatId); // Optional

const response = await fetch('/bb-media/api/media/upload-image', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log('Image URL:', data.imageUrl);
// http://localhost:8080/bb-media/api/media/image/123
```

### List Files

```javascript
// Get paginated file list
const response = await fetch('/bb-media/api/media/list?page=1&limit=20');
const data = await response.json();

console.log('Files:', data.files);
console.log('Pagination:', data.pagination);
// {
//   page: 1,
//   limit: 20,
//   totalCount: 150,
//   totalPages: 8
// }
```

### Check Storage Usage

```javascript
// Get current storage usage
const response = await fetch('/bb-media/api/media/storage');
const data = await response.json();

console.log('Used:', data.mb, 'MB');
console.log('Quota:', data.quota, 'MB');
console.log('Percent:', data.percentUsed, '%');
```

---

## Core Concepts

### Upload Sources

Files can be uploaded from different sources:

- **admin** - Uploaded via admin interface (default)
- **client** - Uploaded via client interface
- **llm** - Generated by LLM (DALL-E, Grok, etc.)
- **api** - Uploaded via external API

The `upload_source` field tracks the origin of each file.

### Image Linking to Messages

Images can be linked to chats and messages in two ways:

#### 1. Upload with Chat ID (Unsent)

```javascript
// Upload image, associate with chat but not yet sent
POST /bb-media/api/media/upload-image
{
  image: File,
  chatId: 123
}

// Image record created with:
// chat_id: 123
// message_id: null  (not yet sent)
```

#### 2. Link to Message After Sending

```javascript
// When message is sent, link the image
POST /bb-media/api/media/link-images-to-message
{
  imageIds: [456, 457],
  messageId: 789
}

// Image records updated with:
// message_id: 789
```

#### 3. Get Unsent Images

```javascript
// Get images uploaded to chat but not yet sent
GET /bb-media/api/media/unsent-images/:chatId

// Returns images where:
// chat_id = chatId
// message_id = null
```

### Storage Limits

Storage limits are enforced at upload time:

1. **Check Current Usage** - Calculate total size of all files
2. **Check File Size** - Get size of file being uploaded
3. **Validate** - Ensure current + new file size ≤ storage limit
4. **Reject or Accept** - Block upload if over limit

Default storage limit: **1024 MB (1 GB)**

Storage limits can be configured via the settings API.

### File Serving

Images are served via public URLs:

```
GET /bb-media/api/media/image/:id
```

- **Returns:** Image file with correct Content-Type
- **Disposition:** inline (displays in browser)
- **Validation:** Ensures file exists and is an image

---

## Usage Examples

### Backend - Controller Access

```javascript
class myController {
  constructor(req) {
    this._mediaContext = req.mediaContext;
    const MediaService = require('path/to/mediaService');
    this.mediaService = new MediaService();
  }

  async myMethod(obj) {
    // Get all media files for a chat
    const mediaFiles = this._mediaContext.MediaFile
      .where(f => f.chat_id == $$, chatId)
      .toList();

    // Get storage stats
    const stats = await this.mediaService.getStorageStats();
    console.log('Total files:', stats.fileCount);
    console.log('Total size:', stats.formattedSize);

    // Format file size
    const formatted = this.mediaService.formatFileSize(1024000);
    console.log(formatted); // "1000 KB"
  }
}
```

### Service - Get Image URLs for Message

```javascript
const MediaService = require('components/media/app/service/mediaService');
const mediaService = new MediaService();

// Get image URLs for a specific message
const baseUrl = 'http://localhost:8080';
const imageUrls = mediaService.getImageUrlsForMessage(
  messageId,
  mediaContext,
  baseUrl
);

console.log('Image URLs:', imageUrls);
// [
//   'http://localhost:8080/bb-media/api/media/image/123',
//   'http://localhost:8080/bb-media/api/media/image/124'
// ]
```

### Analyze Image with LLM

```javascript
// Upload image
const uploadResponse = await fetch('/bb-media/api/media/upload-image', {
  method: 'POST',
  body: formData
});
const { fileId } = await uploadResponse.json();

// Analyze with OpenAI
const analyzeResponse = await fetch('/bb-media/api/media/analyze-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageId: fileId,
    prompt: 'What is in this image?',
    model: 'gpt-4-turbo' // or 'grok-vision-beta'
  })
});

const { response } = await analyzeResponse.json();
console.log('AI Analysis:', response);
```

### Save AI-Generated Image

```javascript
// Save image from OpenAI DALL-E (URL format)
const response = await fetch('/bb-media/api/media/save-generated-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageData: 'https://oaidalleapiprodscus.blob.core.windows.net/...',
    format: 'url',
    chatId: 123,
    messageId: 789,
    filename: 'generated-art.png'
  })
});

const data = await response.json();
console.log('Saved image URL:', data.imageUrl);
// http://localhost:8080/bb-media/api/media/image/456
```

```javascript
// Save base64 image (from DALL-E b64_json format)
const response = await fetch('/bb-media/api/media/save-generated-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageData: 'iVBORw0KGgoAAAANSUhEUgA...',
    format: 'base64',
    chatId: 123,
    messageId: 789
  })
});
```

---

## Configuration

### Environment Variables

```javascript
// config/environments/env.development.json
{
  "mediaStorage": {
    "path": "bb-storage/media"
  }
}
```

```javascript
// config/environments/env.production.json
{
  "mediaStorage": {
    "path": "/var/app/storage/media"
  }
}
```

### Storage Settings

Storage settings are managed via the database:

```javascript
// Get settings
GET /bb-media/api/media/settings

// Response:
{
  "success": true,
  "settings": {
    "storageLimitMB": 1024,
    "storageEnabled": true
  }
}
```

```javascript
// Update settings
POST /bb-media/api/media/settings
{
  "storageLimitMB": 2048,
  "storageEnabled": true
}
```

### Default Settings

- **Storage Limit:** 1024 MB (1 GB)
- **Storage Enabled:** true
- **Upload Directory:** `bb-storage/media/`

---

## Integration

### Integration with Chats Component

The Media component integrates closely with the Chats component:

```javascript
// In chat controller
class chatController {
  constructor(req) {
    this._chatContext = req.chatContext;
    this._mediaContext = req.mediaContext; // Media context available

    const MediaService = require('components/media/app/service/mediaService');
    this.mediaService = new MediaService();
  }

  async sendMessage(obj) {
    // Create message
    const message = new Message();
    message.content = 'Check out this image!';
    // ... save message

    // Get unsent images for this chat
    const unsentImages = this._mediaContext.MediaFile
      .where(f => f.chat_id == $$ && f.message_id == null, chatId)
      .toList();

    // Link images to message
    if (unsentImages.length > 0) {
      for (const image of unsentImages) {
        image.message_id = message.id;
        image.updated_at = Date.now().toString();
      }
      this._mediaContext.saveChanges();
    }

    // Get image URLs for response
    const baseUrl = this._getBaseUrlFromRequest(obj.request);
    const imageUrls = this.mediaService.getImageUrlsForMessage(
      message.id,
      this._mediaContext,
      baseUrl
    );

    return this.returnJson({
      success: true,
      message: message,
      images: imageUrls
    });
  }
}
```

### Integration with RAG Component

The Media component can be used with RAG for document upload:

```javascript
// Upload PDF document
POST /bb-media/api/media/upload
{
  file: document.pdf,
  source: 'rag'
}

// Then process with RAG component
POST /bb-rag/api/rag/process-document
{
  fileId: 123
}
```

### Available in All Controllers

The `mediaContext` is available in all controllers:

```javascript
class anyController {
  constructor(req) {
    this._mediaContext = req.mediaContext; // Available everywhere
  }
}
```

---

## Related Documentation

- **[API.md](./API.md)** - Complete API reference with all endpoints
- **[DATABASE.md](./DATABASE.md)** - Database schema and queries
- **[STORAGE.md](./STORAGE.md)** - Storage management and file operations

---

## Support

For issues, questions, or contributions, please refer to the main Bookbag CE repository.
