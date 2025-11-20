# Storage Management Documentation

Comprehensive guide to file storage, management, and operations in the Media component.

## Overview

The Media component uses a local file system storage strategy with configurable quotas, unique filename generation, and automatic cleanup capabilities. All files are stored in a dedicated directory with metadata tracked in the database.

**Storage Location:** `bb-storage/media/`
**Default Quota:** 1024 MB (1 GB)
**Quota Enforcement:** Upload time validation
**Naming Strategy:** Timestamp + random string + extension

---

## Table of Contents

- [Storage Architecture](#storage-architecture)
- [Directory Structure](#directory-structure)
- [File Naming Convention](#file-naming-convention)
- [Storage Quotas](#storage-quotas)
- [File Operations](#file-operations)
- [Storage Statistics](#storage-statistics)
- [Cleanup Strategies](#cleanup-strategies)
- [Backup & Recovery](#backup--recovery)
- [Security](#security)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

---

## Storage Architecture

### Storage Flow Diagram

```
┌──────────────────┐
│  File Upload     │
│  (Multipart)     │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Temporary Storage│  ← OS temp directory
│ /tmp/uploads/    │  ← Handled by formidable
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Storage Check    │  ← Validate quota limit
│ (MediaService)   │  ← Calculate current usage
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Generate Unique  │  ← timestamp-randomhex.ext
│ Filename         │  ← Prevent collisions
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Move to Storage  │  ← bb-storage/media/
│ (fs.rename)      │  ← Atomic operation
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Database Record  │  ← MediaFile entity
│ (mediaContext)   │  ← Save metadata
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Return URL       │  ← /bb-media/api/media/image/:id
└──────────────────┘
```

### Storage Components

#### 1. MediaService (File Operations)

**Location:** `components/media/app/service/mediaService.js`

**Responsibilities:**
- File saving and deletion
- Unique filename generation
- File size calculation
- Storage statistics
- Directory management

#### 2. MediaController (Business Logic)

**Location:** `components/media/app/controllers/api/mediaController.js`

**Responsibilities:**
- Upload validation
- Storage quota enforcement
- File serving
- Access control

#### 3. MediaSettings (Configuration)

**Location:** Database table `media_settings`

**Responsibilities:**
- Storage quota configuration
- Enable/disable storage
- System-wide settings

---

## Directory Structure

### Production Structure

```
bb-storage/
└── media/
    ├── 1731234567890-abc123def456.png
    ├── 1731234590123-789xyz012345.jpg
    ├── 1731234612345-456uvw789abc.pdf
    ├── 1731234634567-def012ghi345.docx
    └── 1731234656789-mno678pqr901.mp4
```

### Development Structure

```
bookbag-ce/
├── bb-storage/
│   └── media/
│       └── [uploaded files]
├── components/
│   └── media/
│       ├── app/
│       │   └── service/
│       │       └── mediaService.js  ← Storage logic
│       ├── config/
│       │   └── environments/
│       │       ├── env.development.json  ← Storage path config
│       │       └── env.production.json
│       └── db/
│           └── development.sqlite3  ← File metadata
└── tmp/
    └── uploads/  ← Temporary upload directory
```

### Directory Permissions

**Development:**
```bash
# Storage directory
chmod 755 bb-storage/
chmod 755 bb-storage/media/

# Uploaded files
chmod 644 bb-storage/media/*
```

**Production:**
```bash
# Tighter permissions
chmod 750 /var/app/storage/media/
chmod 640 /var/app/storage/media/*

# Owner/Group
chown www-data:www-data /var/app/storage/media/
chown www-data:www-data /var/app/storage/media/*
```

---

## File Naming Convention

### Format

```
{timestamp}-{randomHex}.{extension}
```

### Components

**Timestamp:**
- Format: Unix timestamp (milliseconds since epoch)
- Example: `1731234567890`
- Purpose: Chronological ordering, uniqueness

**Random Hex:**
- Format: 16-character hexadecimal string
- Example: `abc123def456789a`
- Source: `crypto.randomBytes(8).toString('hex')`
- Purpose: Collision prevention, additional uniqueness

**Extension:**
- Preserved from original filename
- Examples: `.png`, `.jpg`, `.pdf`, `.docx`
- Purpose: MIME type detection, file association

### Examples

```javascript
// Original: "vacation-photo.jpg"
// Stored as: "1731234567890-abc123def456789a.jpg"

// Original: "report_2024.pdf"
// Stored as: "1731234590123-def456ghi789012b.pdf"

// Original: "Meeting Notes.docx"
// Stored as: "1731234612345-ghi789jkl012345c.docx"
```

### Implementation

```javascript
// From mediaService.js
generateUniqueFilename(originalFilename) {
  const ext = path.extname(originalFilename);
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${randomString}${ext}`;
}
```

### Benefits

1. **Uniqueness** - Timestamp + random hex = virtually no collisions
2. **Chronological** - Files sorted by upload time
3. **Extension Preservation** - Original file type maintained
4. **Security** - Original filename hidden from public
5. **No Conflicts** - No overwriting of existing files

---

## Storage Quotas

### Overview

Storage quotas prevent unlimited file uploads and control disk usage. Quotas are enforced at upload time before files are saved.

### Configuration

**Database Settings:**
```javascript
// Get current quota
GET /bb-media/api/media/settings

// Response:
{
  "success": true,
  "settings": {
    "storageLimitMB": 1024,  // 1 GB
    "storageEnabled": true
  }
}
```

**Update Quota:**
```javascript
// Set new quota
POST /bb-media/api/media/settings
{
  "storageLimitMB": 2048,  // 2 GB
  "storageEnabled": true
}
```

### Quota Enforcement Flow

```javascript
// From mediaController.js - uploadFile method

// 1. Get current settings
const settings = this._mediaContext.MediaSettings
  .take(1)
  .toList()[0];

if (!settings || !settings.storage_enabled) {
  // Storage disabled or no settings
  return this.returnJson({
    success: false,
    error: 'Storage is disabled'
  });
}

// 2. Get current storage usage
const storageStats = await this.mediaService.getStorageStats();
const currentSizeMB = storageStats.mb;

// 3. Get uploaded file size
const fileSizeMB = file.size / (1024 * 1024);

// 4. Get storage limit
const limitMB = settings.storage_limit_mb || 1024;

// 5. Check if upload would exceed quota
if (currentSizeMB + fileSizeMB > limitMB) {
  return this.returnJson({
    success: false,
    error: 'Storage limit exceeded',
    details: {
      currentUsage: currentSizeMB,
      attemptedUpload: fileSizeMB,
      limit: limitMB,
      available: limitMB - currentSizeMB
    }
  });
}

// 6. Proceed with upload
```

### Quota Calculation

**Total Usage:**
```javascript
// From mediaService.js
async getStorageStats() {
  const files = fs.readdirSync(this.storagePath);

  let totalSize = 0;
  for (const file of files) {
    const filePath = path.join(this.storagePath, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
  }

  const mb = totalSize / (1024 * 1024);

  return {
    totalSize: totalSize,        // Bytes
    mb: mb,                       // Megabytes
    formattedSize: this.formatFileSize(totalSize),
    fileCount: files.length
  };
}
```

### Quota Strategies

#### Strategy 1: Hard Limit (Default)

Block uploads that exceed quota.

```javascript
if (currentUsage + uploadSize > limit) {
  return error('Storage limit exceeded');
}
```

**Pros:**
- Simple to implement
- Prevents over-usage
- Clear error messaging

**Cons:**
- Can block important uploads
- No grace period

#### Strategy 2: Soft Limit with Warning

Allow upload but warn user.

```javascript
if (currentUsage + uploadSize > limit) {
  console.warn('Storage limit exceeded, allowing upload');
  // Continue but log warning
}
```

**Pros:**
- More flexible
- User not blocked
- Can clean up later

**Cons:**
- Disk can fill up
- Requires monitoring

#### Strategy 3: Auto-Cleanup

Delete oldest files when limit reached.

```javascript
if (currentUsage + uploadSize > limit) {
  await this.deleteOldestFiles(uploadSize);
  // Now proceed with upload
}
```

**Pros:**
- Automatic management
- User not blocked
- Self-balancing

**Cons:**
- May delete important files
- Requires careful policy

### Quota Monitoring

**Real-time Check:**
```javascript
GET /bb-media/api/media/storage

Response:
{
  "success": true,
  "totalSize": 536870912,       // 512 MB in bytes
  "mb": 512,
  "formattedSize": "512 MB",
  "fileCount": 150,
  "quota": 1024,                 // MB
  "percentUsed": 50,
  "remaining": 512               // MB
}
```

**Periodic Monitoring:**
```javascript
// Check storage every hour
setInterval(async () => {
  const stats = await mediaService.getStorageStats();
  const settings = mediaContext.MediaSettings.single();

  const percentUsed = (stats.mb / settings.storage_limit_mb) * 100;

  if (percentUsed > 90) {
    console.warn(`Storage at ${percentUsed.toFixed(1)}% capacity`);
    // Send alert, trigger cleanup, etc.
  }
}, 3600000); // 1 hour
```

---

## File Operations

### Upload File

**Complete Upload Flow:**

```javascript
// 1. Receive multipart form data
const formData = await this.parseFormData(obj.request);
const file = formData.files.file || formData.file;

// 2. Validate file exists
if (!file) {
  throw new Error('No file provided');
}

// 3. Check storage quota
const storageStats = await this.mediaService.getStorageStats();
const fileSizeMB = file.size / (1024 * 1024);
const limitMB = settings.storage_limit_mb || 1024;

if (storageStats.mb + fileSizeMB > limitMB) {
  throw new Error('Storage limit exceeded');
}

// 4. Save file to storage
const { storedFilename, filePath } = await this.mediaService.saveFile(
  file.filepath,  // Temp path
  file.originalFilename || file.name
);

// 5. Create database record
const mediaFile = new MediaFile();
mediaFile.filename = file.originalFilename || file.name;
mediaFile.stored_filename = storedFilename;
mediaFile.file_path = filePath;
mediaFile.mime_type = file.mimetype || 'application/octet-stream';
mediaFile.file_size = file.size;
mediaFile.uploaded_by = currentUser?.id || null;
mediaFile.upload_source = formData.source || 'admin';
mediaFile.chat_id = formData.chatId || null;
mediaFile.message_id = formData.messageId || null;
mediaFile.created_at = Date.now().toString();
mediaFile.updated_at = Date.now().toString();

this._mediaContext.MediaFile.add(mediaFile);
this._mediaContext.saveChanges();

// 6. Return success response
return {
  success: true,
  file: mediaFile,
  imageUrl: baseUrl + '/bb-media/api/media/image/' + mediaFile.id
};
```

### Save File (MediaService)

```javascript
// From mediaService.js
async saveFile(tempPath, originalFilename) {
  try {
    // Generate unique filename
    const storedFilename = this.generateUniqueFilename(originalFilename);
    const destinationPath = path.join(this.storagePath, storedFilename);

    // Ensure storage directory exists
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }

    // Move file from temp to storage (atomic operation)
    fs.renameSync(tempPath, destinationPath);

    return {
      storedFilename: storedFilename,
      filePath: destinationPath
    };
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
}
```

**Key Points:**
- Uses `fs.renameSync` for atomic move operation
- Creates directory if doesn't exist
- Returns stored filename and full path
- Handles errors with proper cleanup

### Retrieve File

```javascript
// Serve image by ID
async serveImage(obj) {
  const { id } = obj.params;

  // Get file from database
  const mediaFile = this._mediaContext.MediaFile
    .where(f => f.id == $$, id)
    .single();

  if (!mediaFile) {
    obj.response.statusCode = 404;
    return this.returnJson({ success: false, error: 'File not found' });
  }

  // Check file exists on disk
  const filePath = mediaFile.file_path;
  if (!fs.existsSync(filePath)) {
    obj.response.statusCode = 404;
    return this.returnJson({ success: false, error: 'File not found on disk' });
  }

  // Read file
  const fileBuffer = fs.readFileSync(filePath);

  // Set headers
  obj.response.setHeader('Content-Type', mediaFile.mime_type);
  obj.response.setHeader('Content-Length', fileBuffer.length);
  obj.response.setHeader('Content-Disposition', 'inline');

  // Send file
  obj.response.end(fileBuffer);
}
```

### Delete File

```javascript
// Delete file from storage and database
async deleteFile(obj) {
  const { id } = obj.params;

  // Get file record
  const mediaFile = this._mediaContext.MediaFile
    .where(f => f.id == $$, id)
    .single();

  if (!mediaFile) {
    return this.returnJson({ success: false, error: 'File not found' });
  }

  try {
    // Delete from disk
    await this.mediaService.deleteFile(mediaFile.file_path);

    // Delete from database
    this._mediaContext.MediaFile.remove(mediaFile);
    this._mediaContext.saveChanges();

    return this.returnJson({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return this.returnJson({ success: false, error: 'Failed to delete file' });
  }
}
```

**MediaService.deleteFile:**
```javascript
async deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}
```

---

## Storage Statistics

### Get Statistics

```javascript
// From mediaController.js
async getStats(obj) {
  const mediaFiles = this._mediaContext.MediaFile.toList();

  const stats = {
    totalFiles: mediaFiles.length,
    totalSize: mediaFiles.reduce((sum, f) => sum + f.file_size, 0),
    filesByType: {},
    filesBySource: {},
    recentUploads: []
  };

  // Group by MIME type
  for (const file of mediaFiles) {
    const type = file.mime_type || 'unknown';
    stats.filesByType[type] = (stats.filesByType[type] || 0) + 1;
  }

  // Group by upload source
  for (const file of mediaFiles) {
    const source = file.upload_source || 'unknown';
    stats.filesBySource[source] = (stats.filesBySource[source] || 0) + 1;
  }

  // Get 10 most recent uploads
  const sorted = mediaFiles.sort((a, b) => {
    return parseInt(b.created_at) - parseInt(a.created_at);
  });
  stats.recentUploads = sorted.slice(0, 10);

  return this.returnJson({ success: true, stats });
}
```

### Storage Usage

```javascript
async getStorageUsage(obj) {
  const storageStats = await this.mediaService.getStorageStats();
  const settings = this._mediaContext.MediaSettings.take(1).toList()[0];

  const quota = settings?.storage_limit_mb || 1024;
  const percentUsed = (storageStats.mb / quota) * 100;

  return this.returnJson({
    success: true,
    totalSize: storageStats.totalSize,
    mb: storageStats.mb,
    formattedSize: storageStats.formattedSize,
    fileCount: storageStats.fileCount,
    quota: quota,
    percentUsed: percentUsed.toFixed(2),
    remaining: (quota - storageStats.mb).toFixed(2)
  });
}
```

### File Size Formatting

```javascript
// From mediaService.js
formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Examples:
formatFileSize(0);           // "0 Bytes"
formatFileSize(1024);        // "1 KB"
formatFileSize(1048576);     // "1 MB"
formatFileSize(1536000);     // "1.46 MB"
formatFileSize(1073741824);  // "1 GB"
```

---

## Cleanup Strategies

### Manual Cleanup

**Delete Old Files:**
```javascript
// Delete files older than 30 days
async cleanupOldFiles() {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  const oldFiles = this._mediaContext.MediaFile
    .where(f => parseInt(f.created_at) < thirtyDaysAgo)
    .toList();

  for (const file of oldFiles) {
    await this.mediaService.deleteFile(file.file_path);
    this._mediaContext.MediaFile.remove(file);
  }

  this._mediaContext.saveChanges();

  return { deleted: oldFiles.length };
}
```

### Orphaned File Cleanup

**Find Orphaned Files:**
```javascript
// Files on disk but not in database
async findOrphanedFiles() {
  const diskFiles = fs.readdirSync(this.mediaService.storagePath);

  const dbFiles = this._mediaContext.MediaFile
    .toList()
    .map(f => f.stored_filename);

  const orphaned = diskFiles.filter(f => !dbFiles.includes(f));

  return orphaned;
}
```

**Delete Orphaned Files:**
```javascript
async deleteOrphanedFiles() {
  const orphaned = await this.findOrphanedFiles();

  for (const filename of orphaned) {
    const filePath = path.join(this.mediaService.storagePath, filename);
    fs.unlinkSync(filePath);
  }

  return { deleted: orphaned.length };
}
```

### Missing File Detection

**Find Missing Files:**
```javascript
// Files in database but not on disk
async findMissingFiles() {
  const allFiles = this._mediaContext.MediaFile.toList();

  const missing = [];
  for (const file of allFiles) {
    if (!fs.existsSync(file.file_path)) {
      missing.push(file);
    }
  }

  return missing;
}
```

**Clean Database Records:**
```javascript
async cleanMissingFiles() {
  const missing = await this.findMissingFiles();

  for (const file of missing) {
    this._mediaContext.MediaFile.remove(file);
  }

  this._mediaContext.saveChanges();

  return { cleaned: missing.length };
}
```

### Automated Cleanup Task

```javascript
// Run cleanup task every 24 hours
class CleanupTask {
  constructor(mediaContext, mediaService) {
    this.mediaContext = mediaContext;
    this.mediaService = mediaService;
  }

  async run() {
    console.log('Starting cleanup task...');

    // 1. Delete old files (30+ days)
    const oldDeleted = await this.cleanupOldFiles();
    console.log(`Deleted ${oldDeleted.deleted} old files`);

    // 2. Delete orphaned files
    const orphanedDeleted = await this.deleteOrphanedFiles();
    console.log(`Deleted ${orphanedDeleted.deleted} orphaned files`);

    // 3. Clean missing file records
    const missingCleaned = await this.cleanMissingFiles();
    console.log(`Cleaned ${missingCleaned.cleaned} missing file records`);

    // 4. Generate report
    const stats = await this.mediaService.getStorageStats();
    console.log(`Total storage: ${stats.formattedSize}`);
    console.log(`Total files: ${stats.fileCount}`);

    console.log('Cleanup task complete');
  }

  start() {
    // Run immediately on start
    this.run();

    // Run every 24 hours
    setInterval(() => this.run(), 24 * 60 * 60 * 1000);
  }
}

// Start cleanup task
const cleanupTask = new CleanupTask(mediaContext, mediaService);
cleanupTask.start();
```

---

## Backup & Recovery

### Backup Strategy

**Backup Files:**
```bash
#!/bin/bash
# backup-media.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/media_$DATE"
STORAGE_DIR="bb-storage/media"
DB_FILE="components/media/db/development.sqlite3"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Copy files
cp -r "$STORAGE_DIR" "$BACKUP_DIR/files"

# Copy database
cp "$DB_FILE" "$BACKUP_DIR/media.sqlite3"

# Create tarball
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

echo "Backup complete: $BACKUP_DIR.tar.gz"
```

**Automated Backup:**
```bash
# Add to crontab
# Run daily at 2 AM
0 2 * * * /path/to/backup-media.sh
```

### Restore Strategy

**Restore Files:**
```bash
#!/bin/bash
# restore-media.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore-media.sh backup_file.tar.gz"
  exit 1
fi

# Extract backup
tar -xzf "$BACKUP_FILE"

# Get backup directory name
BACKUP_DIR=$(basename "$BACKUP_FILE" .tar.gz)

# Stop application
pm2 stop bookbag

# Restore files
rm -rf bb-storage/media
cp -r "$BACKUP_DIR/files" bb-storage/media

# Restore database
cp "$BACKUP_DIR/media.sqlite3" components/media/db/development.sqlite3

# Start application
pm2 start bookbag

# Cleanup
rm -rf "$BACKUP_DIR"

echo "Restore complete"
```

### Incremental Backup

```javascript
// Backup only new files since last backup
async incrementalBackup(lastBackupTime) {
  const newFiles = this._mediaContext.MediaFile
    .where(f => parseInt(f.created_at) > lastBackupTime)
    .toList();

  const backupDir = `backups/incremental_${Date.now()}`;
  fs.mkdirSync(backupDir, { recursive: true });

  for (const file of newFiles) {
    const sourcePath = file.file_path;
    const destPath = path.join(backupDir, file.stored_filename);
    fs.copyFileSync(sourcePath, destPath);
  }

  return { backedUp: newFiles.length, directory: backupDir };
}
```

---

## Security

### Access Control

**File Access Validation:**
```javascript
async serveImage(obj) {
  const { id } = obj.params;
  const currentUser = obj.request.user;

  // Get file
  const mediaFile = this._mediaContext.MediaFile
    .where(f => f.id == $$, id)
    .single();

  if (!mediaFile) {
    return this.returnUnauthorized();
  }

  // Check ownership or admin
  if (mediaFile.uploaded_by !== currentUser.id && currentUser.role !== 'admin') {
    return this.returnUnauthorized();
  }

  // Serve file
  // ...
}
```

### Path Traversal Prevention

```javascript
// Prevent path traversal attacks
validateFilePath(filename) {
  // Check for path traversal patterns
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Invalid filename');
  }

  // Ensure file is in storage directory
  const filePath = path.join(this.storagePath, filename);
  const realPath = fs.realpathSync(filePath);

  if (!realPath.startsWith(this.storagePath)) {
    throw new Error('Path traversal detected');
  }

  return filePath;
}
```

### File Type Validation

```javascript
// Validate uploaded file types
validateFileType(mimetype, allowedTypes) {
  const allowed = allowedTypes || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowed.includes(mimetype)) {
    throw new Error(`File type not allowed: ${mimetype}`);
  }

  return true;
}
```

### File Size Validation

```javascript
// Validate file size limits
validateFileSize(fileSize, maxSize) {
  const max = maxSize || 100 * 1024 * 1024; // 100 MB

  if (fileSize > max) {
    throw new Error(`File too large: ${fileSize} bytes (max: ${max})`);
  }

  return true;
}
```

### Virus Scanning

```javascript
// Integrate with ClamAV or similar
async scanFile(filePath) {
  const clam = require('clamscan');

  const scanner = await new clam().init({
    clamdscan: {
      path: '/usr/bin/clamdscan',
    }
  });

  const { isInfected, viruses } = await scanner.scanFile(filePath);

  if (isInfected) {
    fs.unlinkSync(filePath);
    throw new Error(`Virus detected: ${viruses.join(', ')}`);
  }

  return true;
}
```

---

## Performance Optimization

### Caching Strategy

**Cache File Metadata:**
```javascript
class FileCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 60000; // 1 minute
  }

  set(id, data) {
    this.cache.set(id, {
      data: data,
      expires: Date.now() + this.ttl
    });
  }

  get(id) {
    const entry = this.cache.get(id);

    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(id);
      return null;
    }

    return entry.data;
  }

  invalidate(id) {
    this.cache.delete(id);
  }

  clear() {
    this.cache.clear();
  }
}
```

**Usage:**
```javascript
const fileCache = new FileCache();

async serveImage(obj) {
  const { id } = obj.params;

  // Check cache
  let mediaFile = fileCache.get(id);

  if (!mediaFile) {
    // Cache miss - query database
    mediaFile = this._mediaContext.MediaFile
      .where(f => f.id == $$, id)
      .single();

    if (mediaFile) {
      fileCache.set(id, mediaFile);
    }
  }

  // Serve file...
}
```

### Streaming Large Files

```javascript
async streamFile(obj) {
  const { id } = obj.params;

  const mediaFile = this._mediaContext.MediaFile
    .where(f => f.id == $$, id)
    .single();

  if (!mediaFile) {
    return this.returnNotFound();
  }

  // Set headers
  obj.response.setHeader('Content-Type', mediaFile.mime_type);
  obj.response.setHeader('Content-Length', mediaFile.file_size);
  obj.response.setHeader('Content-Disposition', 'inline');

  // Stream file
  const stream = fs.createReadStream(mediaFile.file_path);
  stream.pipe(obj.response);

  stream.on('error', (error) => {
    console.error('Stream error:', error);
    obj.response.statusCode = 500;
    obj.response.end();
  });
}
```

### Thumbnail Generation

```javascript
// Generate thumbnails for images
const sharp = require('sharp');

async generateThumbnail(originalPath, thumbnailPath, width = 200) {
  await sharp(originalPath)
    .resize(width, null, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .toFile(thumbnailPath);

  return thumbnailPath;
}

// Usage in upload
async uploadImage(obj) {
  // ... save original file

  // Generate thumbnail
  if (mediaFile.mime_type.startsWith('image/')) {
    const thumbnailFilename = 'thumb_' + mediaFile.stored_filename;
    const thumbnailPath = path.join(this.storagePath, thumbnailFilename);

    await this.generateThumbnail(mediaFile.file_path, thumbnailPath);

    mediaFile.thumbnail_filename = thumbnailFilename;
    this._mediaContext.saveChanges();
  }

  // ...
}
```

### Lazy Loading

```javascript
// Load file metadata without reading file contents
async listFiles(obj) {
  const { page = 1, limit = 20 } = obj.query;

  // Only load metadata from database
  const files = this._mediaContext.MediaFile
    .orderByDescending(f => f.created_at)
    .skip((page - 1) * limit)
    .take(limit)
    .toList();

  // Return metadata only (no file reads)
  return this.returnJson({
    success: true,
    files: files.map(f => ({
      id: f.id,
      filename: f.filename,
      mimeType: f.mime_type,
      fileSize: f.file_size,
      formattedSize: this.mediaService.formatFileSize(f.file_size),
      createdAt: f.created_at
    }))
  });
}
```

---

## Troubleshooting

### Files Not Uploading

**Problem:** Files fail to upload with generic errors.

**Causes:**
1. Storage directory not writable
2. Disk quota exceeded
3. File size too large
4. Invalid file type

**Solutions:**

```bash
# 1. Check directory permissions
ls -la bb-storage/media/
chmod 755 bb-storage/media/

# 2. Check disk space
df -h

# 3. Check storage quota
curl http://localhost:8080/bb-media/api/media/storage
```

```javascript
// 4. Add detailed error logging
try {
  await this.mediaService.saveFile(tempPath, filename);
} catch (error) {
  console.error('Upload failed:', {
    error: error.message,
    stack: error.stack,
    tempPath: tempPath,
    filename: filename,
    storagePath: this.mediaService.storagePath
  });
  throw error;
}
```

---

### Files Not Accessible

**Problem:** Files uploaded but cannot be accessed via URL.

**Causes:**
1. File deleted from disk
2. Database record missing
3. Incorrect file path
4. Permission issues

**Solutions:**

```javascript
// Check file existence
async debugFile(fileId) {
  const mediaFile = this._mediaContext.MediaFile
    .where(f => f.id == $$, fileId)
    .single();

  if (!mediaFile) {
    console.log('Database record not found');
    return;
  }

  console.log('Database record:', mediaFile);

  const exists = fs.existsSync(mediaFile.file_path);
  console.log('File exists on disk:', exists);

  if (exists) {
    const stats = fs.statSync(mediaFile.file_path);
    console.log('File stats:', {
      size: stats.size,
      permissions: stats.mode.toString(8),
      modified: stats.mtime
    });
  }
}
```

---

### Storage Quota Not Updating

**Problem:** Storage usage doesn't reflect actual disk usage.

**Causes:**
1. Files deleted from disk but not database
2. Files added to disk outside of API
3. Stale cache

**Solutions:**

```javascript
// Recalculate storage from disk
async recalculateStorage() {
  const files = fs.readdirSync(this.mediaService.storagePath);

  let totalSize = 0;
  for (const file of files) {
    const filePath = path.join(this.mediaService.storagePath, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
  }

  console.log('Actual disk usage:', this.mediaService.formatFileSize(totalSize));

  // Compare with database
  const dbFiles = this._mediaContext.MediaFile.toList();
  const dbSize = dbFiles.reduce((sum, f) => sum + f.file_size, 0);

  console.log('Database tracked:', this.mediaService.formatFileSize(dbSize));
  console.log('Difference:', this.mediaService.formatFileSize(Math.abs(totalSize - dbSize)));

  return { diskSize: totalSize, dbSize: dbSize };
}
```

---

### Slow File Serving

**Problem:** Files take too long to serve.

**Causes:**
1. Large files not streamed
2. No caching
3. Database query on every request

**Solutions:**

```javascript
// 1. Use streaming for large files
if (fileSize > 1024 * 1024) { // > 1 MB
  return this.streamFile(obj);
}

// 2. Add caching headers
obj.response.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
obj.response.setHeader('ETag', mediaFile.stored_filename);

// 3. Cache database queries
const cached = fileCache.get(id);
if (cached) {
  return this.serveFromCache(cached);
}
```

---

## Related Documentation

- [README.md](./README.md) - Component overview
- [API.md](./API.md) - Complete API reference
- [DATABASE.md](./DATABASE.md) - Database schema and queries

---

## Support

For issues, questions, or contributions, please refer to the main Bookbag CE repository.
