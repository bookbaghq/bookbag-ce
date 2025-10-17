const master = require('mastercontroller');

/**
 * Media Controller - File Management
 *
 * Routes:
 * - POST /upload - Upload a file
 * - GET /list - List all media files
 * - GET /search - Search media files
 * - DELETE /delete/:id - Delete a media file
 * - GET /stats - Get storage statistics
 */
class mediaController {
  constructor(req) {
    this._currentUser = req.authService.currentUser(req.request, req.userContext);
    this._mediaContext = req.mediaContext;
    this._ragContext = req.ragContext;

    // Lazy load services
    const MediaService = require('../../service/mediaService');
    this.mediaService = new MediaService();
  }

  /**
   * Upload a file
   * POST /upload
   * Requires multipart/form-data with 'file' field
   */
  async uploadFile(obj) {
    try {
      const formData = obj?.params?.formData || obj?.params;
      const uploadSource = formData?.source || 'admin';

      // Check if file was uploaded
      if (!obj.request.file && !formData.file) {
        return this.returnJson({
          success: false,
          error: 'No file uploaded'
        });
      }

      const file = obj.request.file || formData.file;
      const originalName = file.originalname || file.name;
      const tempPath = file.path;
      const mimeType = file.mimetype || file.type;

      // Get file size from temp file
      const tempFileSize = await this.mediaService.getFileSize(tempPath);

      // Check storage limit
      const settings = this._mediaContext.MediaSettings.take(1).toList()[0];
      if (settings && settings.storage_enabled) {
        const storageStats = await this.mediaService.getStorageStats();
        const currentSizeMB = storageStats.totalSize / (1024 * 1024);
        const fileSizeMB = tempFileSize / (1024 * 1024);
        const limitMB = settings.storage_limit_mb || 1024;

        if (currentSizeMB + fileSizeMB > limitMB) {
          // Delete temp file
          await this.mediaService.deleteFile(tempPath);
          return this.returnJson({
            success: false,
            error: `Storage limit exceeded. Current: ${currentSizeMB.toFixed(2)}MB, File: ${fileSizeMB.toFixed(2)}MB, Limit: ${limitMB}MB`
          });
        }
      }

      // Save file to permanent storage
      const { storedFilename, filePath } = await this.mediaService.saveFile(tempPath, originalName);

      // Get file size
      const fileSize = await this.mediaService.getFileSize(filePath);

      // Create database record
      const MediaFile = require('../../models/MediaFile');
      const mediaFile = new MediaFile();
      mediaFile.filename = originalName;
      mediaFile.stored_filename = storedFilename;
      mediaFile.file_path = filePath;
      mediaFile.mime_type = mimeType;
      mediaFile.file_size = fileSize;
      mediaFile.uploaded_by = this._currentUser?.id || null;
      mediaFile.upload_source = uploadSource;
      mediaFile.created_at = Date.now();
      mediaFile.updated_at = Date.now();

      this._mediaContext.MediaFile.add(mediaFile);
      this._mediaContext.saveChanges();

      return this.returnJson({
        success: true,
        file: {
          id: mediaFile.id,
          filename: mediaFile.filename,
          storedFilename: mediaFile.stored_filename,
          mimeType: mediaFile.mime_type,
          fileSize: mediaFile.file_size,
          formattedSize: this.mediaService.formatFileSize(mediaFile.file_size),
          createdAt: mediaFile.created_at
        },
        message: 'File uploaded successfully'
      });

    } catch (error) {
      console.error('❌ Error uploading file:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * List all media files
   * GET /list?page=1&limit=50
   */
  async listFiles(obj) {
    try {
      const page = parseInt(obj?.params?.query?.page || 1, 10);
      const limit = parseInt(obj?.params?.query?.limit || 50, 10);
      const offset = (page - 1) * limit;

      // Get all files from MediaFile only
      const mediaFiles = this._mediaContext.MediaFile.toList();

      const totalCount = mediaFiles.length;

      // Sort by created_at descending
      mediaFiles.sort((a, b) => {
        const aTime = parseInt(a.created_at || 0);
        const bTime = parseInt(b.created_at || 0);
        return bTime - aTime;
      });

      // Apply pagination
      const files = mediaFiles.slice(offset, offset + limit);

      // Format files with file sizes from database
      const formattedFiles = files.map((file) => {
        const fileSize = file.file_size || 0;
        const formattedSize = this.mediaService.formatFileSize(fileSize);

        return {
          id: `media_${file.id}`,
          filename: file.filename,
          storedFilename: file.stored_filename,
          mimeType: file.mime_type,
          fileSize: fileSize,
          formattedSize: formattedSize,
          uploadedBy: file.uploaded_by,
          uploadSource: file.upload_source,
          createdAt: file.created_at,
          updatedAt: file.updated_at,
          source: 'media',
          title: file.filename
        };
      });

      return this.returnJson({
        success: true,
        files: formattedFiles,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });

    } catch (error) {
      console.error('❌ Error listing files:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Search media files
   * GET /search?q=search_term&page=1&limit=50
   */
  async searchFiles(obj) {
    try {
      const searchTerm = obj?.params?.query?.q || '';
      const page = parseInt(obj?.params?.query?.page || 1, 10);
      const limit = parseInt(obj?.params?.query?.limit || 50, 10);
      const offset = (page - 1) * limit;

      if (!searchTerm) {
        return this.listFiles(obj);
      }

      // Get all files from MediaFile only
      const mediaFiles = this._mediaContext.MediaFile.toList();

      // Filter by search term
      const lowerSearch = searchTerm.toLowerCase();
      const filtered = mediaFiles.filter(f =>
        (f.filename && f.filename.toLowerCase().includes(lowerSearch))
      );

      const totalCount = filtered.length;

      // Sort by created_at descending
      filtered.sort((a, b) => {
        const aTime = parseInt(a.created_at || 0);
        const bTime = parseInt(b.created_at || 0);
        return bTime - aTime;
      });

      // Apply pagination
      const files = filtered.slice(offset, offset + limit);

      // Format files with file sizes from database
      const formattedFiles = files.map((file) => {
        const fileSize = file.file_size || 0;
        const formattedSize = this.mediaService.formatFileSize(fileSize);

        return {
          id: `media_${file.id}`,
          filename: file.filename,
          storedFilename: file.stored_filename,
          mimeType: file.mime_type,
          fileSize: fileSize,
          formattedSize: formattedSize,
          uploadedBy: file.uploaded_by,
          uploadSource: file.upload_source,
          createdAt: file.created_at,
          updatedAt: file.updated_at,
          source: 'media',
          title: file.filename
        };
      });

      return this.returnJson({
        success: true,
        files: formattedFiles,
        searchTerm,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });

    } catch (error) {
      console.error('❌ Error searching files:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete a media file
   * DELETE /delete/:id
   */
  async deleteFile(obj) {
    try {
      const fileId = obj?.params?.id || obj?.params?.query?.id;

      if (!fileId) {
        return this.returnJson({
          success: false,
          error: 'File ID is required'
        });
      }

      // Parse the composite ID to get the actual ID
      const [source, id] = fileId.split('_');

      if (source !== 'media') {
        return this.returnJson({
          success: false,
          error: 'Invalid file ID format'
        });
      }

      // Delete from MediaFile
      const file = this._mediaContext.MediaFile
        .where(f => f.id == $$, parseInt(id, 10))
        .single();

      if (!file) {
        return this.returnJson({
          success: false,
          error: 'File not found'
        });
      }

      // Delete physical file
      await this.mediaService.deleteFile(file.file_path);

      // Delete database record
      this._mediaContext.MediaFile.remove(file);
      this._mediaContext.saveChanges();

      return this.returnJson({
        success: true,
        message: 'File deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error deleting file:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get storage statistics
   * GET /stats
   */
  async getStats(obj) {
    try {
      const mediaFileCount = this._mediaContext.MediaFile.count();

      // Calculate total size from database file_size fields
      const mediaFiles = this._mediaContext.MediaFile.toList();
      const totalSize = mediaFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);

      // Get file count by source
      const adminFiles = this._mediaContext.MediaFile
        .where(f => f.upload_source === 'admin')
        .count();
      const clientFiles = this._mediaContext.MediaFile
        .where(f => f.upload_source === 'client')
        .count();
      const apiFiles = this._mediaContext.MediaFile
        .where(f => f.upload_source === 'api')
        .count();

      return this.returnJson({
        success: true,
        stats: {
          totalFiles: mediaFileCount,
          totalSize: totalSize,
          formattedSize: this.mediaService.formatFileSize(totalSize),
          bySource: {
            admin: adminFiles,
            client: clientFiles,
            api: apiFiles
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get media settings
   * GET /settings
   */
  async getSettings(obj) {
    try {
      let settings = this._mediaContext.MediaSettings.take(1).toList()[0];

      // Create default settings if they don't exist
      if (!settings) {
        const MediaSettings = require('../../models/MediaSettings');
        settings = new MediaSettings();
        settings.storage_limit_mb = 1024;
        settings.storage_enabled = true;
        settings.created_at = Date.now().toString();
        settings.updated_at = Date.now().toString();
        this._mediaContext.MediaSettings.add(settings);
        this._mediaContext.saveChanges();
      }

      return this.returnJson({
        success: true,
        settings: {
          storageLimitMB: settings.storage_limit_mb,
          storageEnabled: settings.storage_enabled
        }
      });

    } catch (error) {
      console.error('❌ Error getting settings:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update media settings
   * POST /settings
   */
  async updateSettings(obj) {
    try {
      const { storageLimitMB, storageEnabled } = obj?.params?.formData || {};

      let settings = this._mediaContext.MediaSettings.single();

      if (!settings) {
        const MediaSettings = require('../../models/MediaSettings');
        settings = new MediaSettings();
        settings.created_at = Date.now().toString();
        this._mediaContext.MediaSettings.add(settings);
      }

      if (storageLimitMB !== undefined) {
        settings.storage_limit_mb = parseInt(storageLimitMB, 10);
      }
      if (storageEnabled !== undefined) {
        settings.storage_enabled = storageEnabled;
      }
      settings.updated_at = Date.now().toString();

      this._mediaContext.saveChanges();

      return this.returnJson({
        success: true,
        settings: {
          storageLimitMB: settings.storage_limit_mb,
          storageEnabled: settings.storage_enabled
        },
        message: 'Settings updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating settings:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get storage usage with limit
   * GET /storage
   */
  async getStorageUsage(obj) {
    try {
      // Calculate total size from database file_size fields
      const mediaFiles = this._mediaContext.MediaFile.toList();
      const totalSize = mediaFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);

      const settings = this._mediaContext.MediaSettings.take(1).toList()[0];

      const limitMB = settings?.storage_limit_mb || 1024;
      const usedMB = totalSize / (1024 * 1024);
      const percentUsed = (usedMB / limitMB) * 100;

      return this.returnJson({
        success: true,
        mb: parseFloat(usedMB.toFixed(2)),
        quota: limitMB,
        percentUsed: parseFloat(percentUsed.toFixed(1)),
        formattedSize: this.mediaService.formatFileSize(totalSize)
      });

    } catch (error) {
      console.error('❌ Error getting storage usage:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  returnJson(obj) {
    return obj;
  }
}

module.exports = mediaController;
