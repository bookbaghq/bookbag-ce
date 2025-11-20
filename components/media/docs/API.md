# Media API Documentation

Complete API reference for the Media component endpoints.

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Test](#test)
  - [Upload File](#upload-file)
  - [Upload Image](#upload-image)
  - [Analyze Image](#analyze-image)
  - [Save Generated Image](#save-generated-image)
  - [List Files](#list-files)
  - [Search Files](#search-files)
  - [Get Statistics](#get-statistics)
  - [Get Storage Usage](#get-storage-usage)
  - [Get Settings](#get-settings)
  - [Update Settings](#update-settings)
  - [Get Unsent Images](#get-unsent-images)
  - [Link Images to Message](#link-images-to-message)
  - [Serve Image](#serve-image)
  - [Delete File](#delete-file)
- [Error Handling](#error-handling)

---

## Overview

The Media API provides endpoints for:
- File and image uploads
- Image analysis with LLM vision APIs
- AI-generated image management
- File search and listing
- Storage quota management
- Settings configuration

All endpoints return JSON unless specified otherwise.

---

## Base URL

```
/bb-media/api/media
```

**Full URL Example:** `http://localhost:8080/bb-media/api/media/list`

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message description"
}
```

---

## Endpoints

### Test

Test endpoint to verify API is working.

**Route:** `GET /test`

**Request:**
```bash
curl -X GET http://localhost:8080/bb-media/api/media/test
```

**Response:**
```json
{
  "success": true,
  "message": "Test endpoint working!",
  "timestamp": 1731234567890
}
```

---

### Upload File

Upload any file type to the media storage.

**Route:** `POST /upload`

**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | File to upload |
| `source` | String | No | Upload source (`admin`, `client`, `api`) |

**Request:**
```bash
curl -X POST http://localhost:8080/bb-media/api/media/upload \
  -F "file=@/path/to/file.pdf" \
  -F "source=admin"
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": 123,
    "filename": "document.pdf",
    "storedFilename": "1731234567890-abc123def456.pdf",
    "mimeType": "application/pdf",
    "fileSize": 1024000,
    "formattedSize": "1000 KB",
    "createdAt": "1731234567890"
  },
  "message": "File uploaded successfully"
}
```

**Storage Limit:**
- Checks available storage before upload
- Rejects if upload would exceed `storage_limit_mb`
- Returns error with current/limit/file size details

**Error Response:**
```json
{
  "success": false,
  "error": "Storage limit exceeded. Current: 980.50MB, File: 50.00MB, Limit: 1024MB"
}
```

---

### Upload Image

Upload an image specifically for LLM vision/analysis. Optionally link to a chat.

**Route:** `POST /upload-image`

**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | File | Yes | Image file (jpg, png, gif, webp) |
| `source` | String | No | Upload source (default: `client`) |
| `chatId` | Integer | No | Link to chat ID (creates new chat if not provided) |

**Request:**
```bash
curl -X POST http://localhost:8080/bb-media/api/media/upload-image \
  -F "image=@/path/to/photo.jpg" \
  -F "source=client" \
  -F "chatId=456"
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": 789,
    "filename": "photo.jpg",
    "storedFilename": "1731234590123-xyz789abc012.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 512000,
    "formattedSize": "500 KB",
    "createdAt": "1731234590123",
    "url": "http://localhost:8080/bb-media/api/media/image/789"
  },
  "imageUrl": "http://localhost:8080/bb-media/api/media/image/789",
  "fileId": 789,
  "chatId": 456,
  "message": "Image uploaded successfully"
}
```

**Notes:**
- Validates file is an image type
- Creates new chat if `chatId` not provided
- Sets `message_id` to `null` (unsent image)
- Returns full image URL for use with LLM APIs

---

### Analyze Image

Analyze an uploaded image using OpenAI or Grok vision API.

**Route:** `POST /analyze-image`

**Content-Type:** `application/json`

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `imageId` | Integer | Yes | ID of uploaded image |
| `prompt` | String | No | Analysis prompt (default: "Describe this image in detail.") |
| `model` | String | No | Model to use (`gpt-4-turbo`, `grok-vision-beta`) |

**Request:**
```bash
curl -X POST http://localhost:8080/bb-media/api/media/analyze-image \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": 789,
    "prompt": "What objects are in this image?",
    "model": "gpt-4-turbo"
  }'
```

**Response (OpenAI):**
```json
{
  "success": true,
  "response": "The image contains a laptop, coffee mug, and notebook on a wooden desk.",
  "model": "gpt-4-turbo",
  "usage": {
    "prompt_tokens": 125,
    "completion_tokens": 18,
    "total_tokens": 143
  }
}
```

**Response (Grok):**
```json
{
  "success": true,
  "response": "I can see a workspace setup with a laptop computer...",
  "model": "grok-vision-beta",
  "usage": {
    "prompt_tokens": 120,
    "completion_tokens": 25,
    "total_tokens": 145
  }
}
```

**Supported Models:**
- **OpenAI:** `gpt-4-turbo`, `gpt-4o`, `gpt-4o-mini`
- **Grok:** `grok-vision-beta`

**Requirements:**
- **OpenAI:** `OPENAI_API_KEY` environment variable
- **Grok:** `GROK_API_KEY` or `XAI_API_KEY` environment variable

**Error Responses:**
```json
{
  "success": false,
  "error": "OpenAI API key not configured"
}
```

```json
{
  "success": false,
  "error": "Image not found"
}
```

```json
{
  "success": false,
  "error": "File is not an image"
}
```

---

### Save Generated Image

Save an AI-generated image (from DALL-E, Grok, etc.) to storage and link to a message.

**Route:** `POST /save-generated-image`

**Content-Type:** `application/json`

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `imageData` | String | Yes | Image URL or base64 data |
| `format` | String | Yes | Format: `url` or `base64` |
| `chatId` | Integer | Yes | Chat ID to link to |
| `messageId` | Integer | Yes | Message ID to link to |
| `filename` | String | No | Custom filename |
| `mimeType` | String | No | MIME type (auto-detected if not provided) |

**Request (URL Format):**
```bash
curl -X POST http://localhost:8080/bb-media/api/media/save-generated-image \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "https://oaidalleapiprodscus.blob.core.windows.net/...",
    "format": "url",
    "chatId": 123,
    "messageId": 789,
    "filename": "generated-art.png"
  }'
```

**Request (Base64 Format):**
```bash
curl -X POST http://localhost:8080/bb-media/api/media/save-generated-image \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "iVBORw0KGgoAAAANSUhEUgAA...",
    "format": "base64",
    "chatId": 123,
    "messageId": 789
  }'
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": 890,
    "filename": "generated-art.png",
    "storedFilename": "1731234600000-def456ghi789.png",
    "mimeType": "image/png",
    "fileSize": 256000,
    "formattedSize": "250 KB",
    "chatId": 123,
    "messageId": 789,
    "url": "http://localhost:8080/bb-media/api/media/image/890",
    "createdAt": "1731234600000"
  },
  "imageUrl": "http://localhost:8080/bb-media/api/media/image/890",
  "message": "Generated image saved successfully"
}
```

**Notes:**
- Automatically downloads from URL if `format: "url"`
- Decodes base64 if `format: "base64"`
- Detects MIME type from URL response headers or data URL prefix
- Sets `upload_source` to `llm`
- Immediately links to both chat and message

---

### List Files

Get paginated list of all media files.

**Route:** `GET /list`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | Integer | `1` | Page number |
| `limit` | Integer | `50` | Files per page |

**Request:**
```bash
curl -X GET "http://localhost:8080/bb-media/api/media/list?page=1&limit=20"
```

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": "media_890",
      "filename": "generated-art.png",
      "storedFilename": "1731234600000-def456ghi789.png",
      "mimeType": "image/png",
      "fileSize": 256000,
      "formattedSize": "250 KB",
      "uploadedBy": 1,
      "uploadSource": "llm",
      "createdAt": "1731234600000",
      "updatedAt": "1731234600000",
      "source": "media",
      "title": "generated-art.png"
    },
    {
      "id": "media_789",
      "filename": "photo.jpg",
      "storedFilename": "1731234590123-xyz789abc012.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 512000,
      "formattedSize": "500 KB",
      "uploadedBy": 1,
      "uploadSource": "client",
      "createdAt": "1731234590123",
      "updatedAt": "1731234590123",
      "source": "media",
      "title": "photo.jpg"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 150,
    "totalPages": 8
  }
}
```

**Notes:**
- Files are sorted by `created_at` descending (newest first)
- Composite ID format: `media_{id}`
- `formattedSize` is human-readable (KB, MB, GB)

---

### Search Files

Search media files by filename.

**Route:** `GET /search`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | String | Yes | Search term |
| `page` | Integer | No | Page number (default: `1`) |
| `limit` | Integer | No | Files per page (default: `50`) |

**Request:**
```bash
curl -X GET "http://localhost:8080/bb-media/api/media/search?q=photo&page=1&limit=20"
```

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": "media_789",
      "filename": "photo.jpg",
      "storedFilename": "1731234590123-xyz789abc012.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 512000,
      "formattedSize": "500 KB",
      "uploadedBy": 1,
      "uploadSource": "client",
      "createdAt": "1731234590123",
      "updatedAt": "1731234590123",
      "source": "media",
      "title": "photo.jpg"
    }
  ],
  "searchTerm": "photo",
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 1,
    "totalPages": 1
  }
}
```

**Search Behavior:**
- Case-insensitive search
- Searches `filename` field only
- Returns all files if `q` is empty (same as `/list`)

---

### Get Statistics

Get file count and storage statistics.

**Route:** `GET /stats`

**Request:**
```bash
curl -X GET http://localhost:8080/bb-media/api/media/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalFiles": 150,
    "totalSize": 524288000,
    "formattedSize": "500 MB",
    "bySource": {
      "admin": 45,
      "client": 80,
      "api": 25
    }
  }
}
```

**Notes:**
- `totalSize` is in bytes
- `formattedSize` is human-readable
- `bySource` shows file count by `upload_source`

---

### Get Storage Usage

Get current storage usage with quota information.

**Route:** `GET /storage`

**Request:**
```bash
curl -X GET http://localhost:8080/bb-media/api/media/storage
```

**Response:**
```json
{
  "success": true,
  "mb": 489.06,
  "quota": 1024,
  "percentUsed": 47.8,
  "formattedSize": "500 MB"
}
```

**Fields:**
- `mb` - Used storage in megabytes
- `quota` - Storage limit in megabytes
- `percentUsed` - Percentage of quota used
- `formattedSize` - Human-readable used storage

---

### Get Settings

Get media component settings.

**Route:** `GET /settings`

**Request:**
```bash
curl -X GET http://localhost:8080/bb-media/api/media/settings
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "storageLimitMB": 1024,
    "storageEnabled": true
  }
}
```

**Notes:**
- Creates default settings if none exist
- Default storage limit: 1024 MB (1 GB)
- Default storage enabled: `true`

---

### Update Settings

Update media component settings.

**Route:** `POST /settings`

**Content-Type:** `application/json`

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `storageLimitMB` | Integer | No | Storage limit in MB |
| `storageEnabled` | Boolean | No | Enable/disable storage limit enforcement |

**Request:**
```bash
curl -X POST http://localhost:8080/bb-media/api/media/settings \
  -H "Content-Type: application/json" \
  -d '{
    "storageLimitMB": 2048,
    "storageEnabled": true
  }'
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "storageLimitMB": 2048,
    "storageEnabled": true
  },
  "message": "Settings updated successfully"
}
```

**Notes:**
- Updates only provided fields
- Enforces storage limit on subsequent uploads
- Disable enforcement with `storageEnabled: false`

---

### Get Unsent Images

Get images uploaded to a chat but not yet linked to a message.

**Route:** `GET /unsent-images/:chatId`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chatId` | Integer | Yes | Chat ID |

**Request:**
```bash
curl -X GET http://localhost:8080/bb-media/api/media/unsent-images/456
```

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "id": 789,
      "filename": "photo.jpg",
      "url": "http://localhost:8080/bb-media/api/media/image/789",
      "mimeType": "image/jpeg",
      "fileSize": 512000,
      "createdAt": "1731234590123"
    },
    {
      "id": 790,
      "filename": "screenshot.png",
      "url": "http://localhost:8080/bb-media/api/media/image/790",
      "mimeType": "image/png",
      "fileSize": 128000,
      "createdAt": "1731234595456"
    }
  ]
}
```

**Query Logic:**
```sql
WHERE chat_id = :chatId AND message_id IS NULL
```

**Use Case:**
- Get images user uploaded but hasn't sent yet
- Display preview in chat UI before sending message

---

### Link Images to Message

Link one or more images to a specific message.

**Route:** `POST /link-images-to-message`

**Content-Type:** `application/json`

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `imageIds` | Array | Yes | Array of image IDs |
| `messageId` | Integer | Yes | Message ID to link to |

**Request:**
```bash
curl -X POST http://localhost:8080/bb-media/api/media/link-images-to-message \
  -H "Content-Type: application/json" \
  -d '{
    "imageIds": [789, 790],
    "messageId": 1001
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Linked 2 images to message 1001"
}
```

**Notes:**
- Updates `message_id` field for all specified images
- Updates `updated_at` timestamp
- Silently ignores non-existent image IDs

---

### Serve Image

Serve an image file by ID. Returns the actual image file, not JSON.

**Route:** `GET /image/:id`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | Integer | Yes | Image file ID |

**Request:**
```bash
curl -X GET http://localhost:8080/bb-media/api/media/image/789
```

**Response:**
- **Content-Type:** Image MIME type (e.g., `image/jpeg`, `image/png`)
- **Content-Disposition:** `inline; filename="photo.jpg"`
- **Body:** Raw image data

**Browser Usage:**
```html
<img src="http://localhost:8080/bb-media/api/media/image/789" alt="Photo">
```

**Validation:**
- Verifies file exists in database
- Verifies file is an image (MIME type check)
- Verifies file exists on disk
- Returns 404 if any check fails

**Error Response (JSON):**
```json
{
  "success": false,
  "error": "File not found"
}
```

```json
{
  "success": false,
  "error": "File is not an image"
}
```

```json
{
  "success": false,
  "error": "Image file not found on disk"
}
```

---

### Delete File

Delete a media file from storage and database.

**Route:** `DELETE /delete/:id`

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Composite file ID (format: `media_{id}`) |

**Request:**
```bash
curl -X DELETE http://localhost:8080/bb-media/api/media/delete/media_789
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**Error Responses:**
```json
{
  "success": false,
  "error": "File ID is required"
}
```

```json
{
  "success": false,
  "error": "Invalid file ID format"
}
```

```json
{
  "success": false,
  "error": "File not found"
}
```

**Notes:**
- Deletes physical file from storage
- Deletes database record
- ID must be in composite format: `media_{id}`
- Parses composite ID to extract numeric ID

---

## Error Handling

### Common Error Responses

#### No File Uploaded
```json
{
  "success": false,
  "error": "No file uploaded"
}
```

#### Storage Limit Exceeded
```json
{
  "success": false,
  "error": "Storage limit exceeded. Current: 980.50MB, File: 50.00MB, Limit: 1024MB"
}
```

#### File Not Found
```json
{
  "success": false,
  "error": "File not found"
}
```

#### Invalid File Type
```json
{
  "success": false,
  "error": "File must be an image (jpg, png, gif, webp)"
}
```

#### API Key Not Configured
```json
{
  "success": false,
  "error": "OpenAI API key not configured"
}
```

```json
{
  "success": false,
  "error": "Grok API key not configured"
}
```

#### Unsupported Model
```json
{
  "success": false,
  "error": "Unsupported model: gpt-3.5-turbo. Use gpt-4-turbo or grok-vision-beta"
}
```

### HTTP Status Codes

All endpoints return HTTP 200 with `success: true/false` in JSON body.

Actual HTTP error codes (404, 500, etc.) are used only for:
- Route not found
- Server crashes
- Missing middleware

---

## Related Documentation

- **[README.md](./README.md)** - Component overview and usage
- **[DATABASE.md](./DATABASE.md)** - Database schema and queries
- **[STORAGE.md](./STORAGE.md)** - Storage management details
