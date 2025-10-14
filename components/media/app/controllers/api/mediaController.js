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

      // Get all files from MediaFile
      const mediaFiles = this._mediaContext.MediaFile.toList();

      // Get all RAG documents
      const ragDocs = this._ragContext.Document.toList();

      // Merge both lists with a source indicator
      const allFiles = [
        ...mediaFiles.map(f => ({
          ...f,
          source: 'media',
          _id: `media_${f.id}`
        })),
        ...ragDocs.map(d => ({
          id: d.id,
          filename: d.filename,
          stored_filename: d.filename,
          file_path: d.file_path,
          mime_type: d.mime_type,
          file_size: d.file_size || 0,
          uploaded_by: null,
          upload_source: d.chat_id ? 'chat' : (d.workspace_id ? 'workspace' : 'rag'),
          created_at: d.created_at,
          updated_at: d.updated_at,
          source: 'rag',
          _id: `rag_${d.id}`,
          title: d.title
        }))
      ];

      const totalCount = allFiles.length;

      // Sort by created_at descending
      allFiles.sort((a, b) => {
        const aTime = parseInt(a.created_at || 0);
        const bTime = parseInt(b.created_at || 0);
        return bTime - aTime;
      });

      // Apply pagination
      const files = allFiles.slice(offset, offset + limit);

      // Format files with file sizes from database
      const formattedFiles = files.map((file) => {
        const fileSize = file.file_size || 0;
        const formattedSize = this.mediaService.formatFileSize(fileSize);

        return {
          id: file._id,
          filename: file.filename,
          storedFilename: file.stored_filename,
          mimeType: file.mime_type,
          fileSize: fileSize,
          formattedSize: formattedSize,
          uploadedBy: file.uploaded_by,
          uploadSource: file.upload_source,
          createdAt: file.created_at,
          updatedAt: file.updated_at,
          source: file.source,
          title: file.title || file.filename
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

      // Get all files from MediaFile
      const mediaFiles = this._mediaContext.MediaFile.toList();

      // Get all RAG documents
      const ragDocs = this._ragContext.Document.toList();

      // Merge both lists with a source indicator
      const allFiles = [
        ...mediaFiles.map(f => ({
          ...f,
          source: 'media',
          _id: `media_${f.id}`
        })),
        ...ragDocs.map(d => ({
          id: d.id,
          filename: d.filename,
          stored_filename: d.filename,
          file_path: d.file_path,
          mime_type: d.mime_type,
          file_size: d.file_size || 0,
          uploaded_by: null,
          upload_source: d.chat_id ? 'chat' : (d.workspace_id ? 'workspace' : 'rag'),
          created_at: d.created_at,
          updated_at: d.updated_at,
          source: 'rag',
          _id: `rag_${d.id}`,
          title: d.title
        }))
      ];

      // Filter by search term
      const lowerSearch = searchTerm.toLowerCase();
      const filtered = allFiles.filter(f =>
        (f.filename && f.filename.toLowerCase().includes(lowerSearch)) ||
        (f.title && f.title.toLowerCase().includes(lowerSearch))
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
          id: file._id,
          filename: file.filename,
          storedFilename: file.stored_filename,
          mimeType: file.mime_type,
          fileSize: fileSize,
          formattedSize: formattedSize,
          uploadedBy: file.uploaded_by,
          uploadSource: file.upload_source,
          createdAt: file.created_at,
          updatedAt: file.updated_at,
          source: file.source,
          title: file.title || file.filename
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

      // Parse the composite ID to determine source
      const [source, id] = fileId.split('_');

      if (source === 'media') {
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

      } else if (source === 'rag') {
        // Delete from RAG Document
        const doc = this._ragContext.Document
          .where(d => d.id == $$, parseInt(id, 10))
          .single();

        if (!doc) {
          return this.returnJson({
            success: false,
            error: 'Document not found'
          });
        }

        // Delete physical file
        try {
          await this.mediaService.deleteFile(doc.file_path);
        } catch (err) {
          console.error('Error deleting physical file:', err);
        }

        // Delete document chunks first (if any)
        const chunks = this._ragContext.DocumentChunk
          .where(c => c.document_id == $$, parseInt(id, 10))
          .toList();

        chunks.forEach(chunk => {
          this._ragContext.DocumentChunk.remove(chunk);
        });

        // Delete database record
        this._ragContext.Document.remove(doc);
        this._ragContext.saveChanges();

      } else {
        return this.returnJson({
          success: false,
          error: 'Invalid file ID format'
        });
      }

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
      const ragDocCount = this._ragContext.Document.count();
      const totalCount = mediaFileCount + ragDocCount;

      // Calculate total size from database file_size fields
      const mediaFiles = this._mediaContext.MediaFile.toList();
      const ragDocs = this._ragContext.Document.toList();

      const mediaTotalSize = mediaFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);
      const ragTotalSize = ragDocs.reduce((sum, d) => sum + (d.file_size || 0), 0);
      const totalSize = mediaTotalSize + ragTotalSize;

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

      // Get RAG document counts
      const chatDocs = ragDocs.filter(d => d.chat_id).length;
      const workspaceDocs = ragDocs.filter(d => d.workspace_id && !d.chat_id).length;
      const ragFiles = ragDocs.filter(d => !d.chat_id && !d.workspace_id).length;

      return this.returnJson({
        success: true,
        stats: {
          totalFiles: totalCount,
          totalSize: totalSize,
          formattedSize: this.mediaService.formatFileSize(totalSize),
          bySource: {
            admin: adminFiles,
            client: clientFiles,
            api: apiFiles,
            chat: chatDocs,
            workspace: workspaceDocs,
            rag: ragFiles
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
      const ragDocs = this._ragContext.Document.toList();

      const mediaTotalSize = mediaFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);
      const ragTotalSize = ragDocs.reduce((sum, d) => sum + (d.file_size || 0), 0);
      const totalSize = mediaTotalSize + ragTotalSize;

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

  /**
   * List RAG files only
   * GET /rag/list?page=1&limit=50
   */
  async listRagFiles(obj) {
    try {
      const page = parseInt(obj?.params?.query?.page || 1, 10);
      const limit = parseInt(obj?.params?.query?.limit || 50, 10);
      const offset = (page - 1) * limit;

      // Get all RAG documents
      const ragDocs = this._ragContext.Document.toList();

      const totalCount = ragDocs.length;

      // Sort by created_at descending
      ragDocs.sort((a, b) => {
        const aTime = parseInt(a.created_at || 0);
        const bTime = parseInt(b.created_at || 0);
        return bTime - aTime;
      });

      // Apply pagination
      const files = ragDocs.slice(offset, offset + limit);

      // Format files with file sizes from database
      const formattedFiles = files.map((doc) => {
        const fileSize = doc.file_size || 0;
        const formattedSize = this.mediaService.formatFileSize(fileSize);

        return {
          id: doc.id,
          filename: doc.filename,
          storedFilename: doc.filename,
          mimeType: doc.mime_type,
          fileSize: fileSize,
          formattedSize: formattedSize,
          uploadedBy: null,
          uploadSource: doc.chat_id ? 'chat' : (doc.workspace_id ? 'workspace' : 'rag'),
          createdAt: doc.created_at,
          updatedAt: doc.updated_at,
          source: 'rag',
          title: doc.title,
          chatId: doc.chat_id,
          workspaceId: doc.workspace_id
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
      console.error('❌ Error listing RAG files:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Search RAG files only
   * GET /rag/search?q=search_term&page=1&limit=50
   */
  async searchRagFiles(obj) {
    try {
      const searchTerm = obj?.params?.query?.q || '';
      const page = parseInt(obj?.params?.query?.page || 1, 10);
      const limit = parseInt(obj?.params?.query?.limit || 50, 10);
      const offset = (page - 1) * limit;

      if (!searchTerm) {
        return this.listRagFiles(obj);
      }

      // Get all RAG documents
      const ragDocs = this._ragContext.Document.toList();

      // Filter by search term
      const lowerSearch = searchTerm.toLowerCase();
      const filtered = ragDocs.filter(d =>
        (d.filename && d.filename.toLowerCase().includes(lowerSearch)) ||
        (d.title && d.title.toLowerCase().includes(lowerSearch))
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
      const formattedFiles = files.map((doc) => {
        const fileSize = doc.file_size || 0;
        const formattedSize = this.mediaService.formatFileSize(fileSize);

        return {
          id: doc.id,
          filename: doc.filename,
          storedFilename: doc.filename,
          mimeType: doc.mime_type,
          fileSize: fileSize,
          formattedSize: formattedSize,
          uploadedBy: null,
          uploadSource: doc.chat_id ? 'chat' : (doc.workspace_id ? 'workspace' : 'rag'),
          createdAt: doc.created_at,
          updatedAt: doc.updated_at,
          source: 'rag',
          title: doc.title,
          chatId: doc.chat_id,
          workspaceId: doc.workspace_id
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
      console.error('❌ Error searching RAG files:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get RAG statistics
   * GET /rag/stats
   */
  async getRagStats(obj) {
    try {
      const ragDocs = this._ragContext.Document.toList();

      const totalFiles = ragDocs.length;
      const chatFiles = ragDocs.filter(d => d.chat_id).length;
      const workspaceFiles = ragDocs.filter(d => d.workspace_id && !d.chat_id).length;
      const ragFiles = ragDocs.filter(d => !d.chat_id && !d.workspace_id).length;

      return this.returnJson({
        success: true,
        stats: {
          totalFiles,
          chatFiles,
          workspaceFiles,
          ragFiles
        }
      });

    } catch (error) {
      console.error('❌ Error getting RAG stats:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete a RAG document
   * DELETE /rag/delete/:id
   */
  async deleteRagFile(obj) {
    try {
      const fileId = obj?.params?.id || obj?.params?.query?.id;

      if (!fileId) {
        return this.returnJson({
          success: false,
          error: 'File ID is required'
        });
      }

      // Get document
      const doc = this._ragContext.Document
        .where(d => d.id == $$, parseInt(fileId, 10))
        .single();

      if (!doc) {
        return this.returnJson({
          success: false,
          error: 'Document not found'
        });
      }

      // Delete physical file
      try {
        await this.mediaService.deleteFile(doc.file_path);
      } catch (err) {
        console.error('Error deleting physical file:', err);
      }

      // Delete document chunks first (if any)
      const chunks = this._ragContext.DocumentChunk
        .where(c => c.document_id == $$, parseInt(fileId, 10))
        .toList();

      chunks.forEach(chunk => {
        this._ragContext.DocumentChunk.remove(chunk);
      });

      // Delete database record
      this._ragContext.Document.remove(doc);
      this._ragContext.saveChanges();

      return this.returnJson({
        success: true,
        message: 'RAG document deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error deleting RAG file:', error);
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
