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
    this._chatContext = req.chatContext;

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
      mediaFile.created_at = Date.now().toString();
      mediaFile.updated_at = Date.now().toString();

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

  /**
   * Test endpoint
   * GET /test
   */
  async test(obj) {
    console.log('🧪 Test endpoint hit!');
    return this.returnJson({
      success: true,
      message: 'Test endpoint working!',
      timestamp: Date.now()
    });
  }

  /**
   * Upload an image for vision/analysis
   * POST /upload-image
   * Requires multipart/form-data with 'image' field
   * Returns image URL for use with LLM APIs
   */
  async uploadImage(obj) {
    try {
      console.log('📤 Upload image request received');
      console.log('Request keys:', Object.keys(obj));
      console.log('obj.request keys:', obj.request ? Object.keys(obj.request) : 'no request');
      console.log('obj.params keys:', obj.params ? Object.keys(obj.params) : 'no params');

      const formData = obj?.params?.formData || obj?.params;
      console.log('formData keys:', formData ? Object.keys(formData) : 'no formData');
      if (formData?.files) {
        console.log('formData.files keys:', Object.keys(formData.files));
      }
      if (formData?.fields) {
        console.log('formData.fields:', formData.fields);
      }

      const uploadSource = formData?.fields?.source || formData?.source || 'client';
      let chatId = formData?.fields?.chatId || formData?.chatId || null;

      // Check if file was uploaded - handle multiple possible structures (same as RAG)
      let file = null;

      // Check for single file in different locations
      if (obj.request?.file) {
        console.log('✓ Found file in obj.request.file');
        file = obj.request.file;
      } else if (formData?.file) {
        console.log('✓ Found file in formData.file');
        file = formData.file;
      } else if (formData?.files?.image) {
        console.log('✓ Found file in formData.files.image');
        // Handle formData.files.image structure
        const fileUpload = formData.files.image;
        file = Array.isArray(fileUpload) ? fileUpload[0] : fileUpload;
      } else if (formData?.files?.file) {
        console.log('✓ Found file in formData.files.file');
        // Handle formData.files.file structure
        const fileUpload = formData.files.file;
        file = Array.isArray(fileUpload) ? fileUpload[0] : fileUpload;
      } else if (formData?.files) {
        console.log('Checking formData.files with keys:', Object.keys(formData.files));
        // Handle formData.files['image'] or any other field name
        const fileKeys = Object.keys(formData.files);
        if (fileKeys.length > 0) {
          console.log('✓ Found file in formData.files[' + fileKeys[0] + ']');
          const firstFile = formData.files[fileKeys[0]];
          file = Array.isArray(firstFile) ? firstFile[0] : firstFile;
        }
      }

      if (!file) {
        console.log('❌ No file found in request');
        console.log('Detailed structure:');
        console.log('obj.request:', obj.request ? JSON.stringify(Object.keys(obj.request)) : 'undefined');
        console.log('formData:', formData ? JSON.stringify(Object.keys(formData)) : 'undefined');
        return this.returnJson({
          success: false,
          error: 'No image uploaded'
        });
      }

      console.log('✓ File found, properties:', Object.keys(file));

      const originalName = file.originalname || file.originalFilename || file.name;
      const tempPath = file.filepath || file.path || file.tempFilePath;
      const mimeType = file.mimetype || file.type;

      // Validate it's an image
      if (!mimeType || !mimeType.startsWith('image/')) {
        return this.returnJson({
          success: false,
          error: 'File must be an image (jpg, png, gif, webp)'
        });
      }

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

      // If chatId is not provided, create a new chat (like RAG does)
      if (!chatId) {
        const crypto = require('crypto');
        const chatEntity = require(`${master.root}/components/chats/app/models/chat`);
        const userChatEntity = require(`${master.root}/components/chats/app/models/userchat`);
        const timestamp = Date.now().toString();

        // Create new chat
        const chat = new chatEntity();
        chat.created_at = timestamp;
        chat.updated_at = timestamp;
        chat.session_id = crypto.randomBytes(32).toString('hex');
        chat.total_token_count = 0;
        chat.title = `Image Upload: ${originalName}`;
    

        this._chatContext.Chat.add(chat);
        this._chatContext.saveChanges();

        chatId = chat.id;
        console.log(`✓ Created new chat with ID: ${chatId}`);

        // Create UserChat join record
        const userChat = new userChatEntity();
        userChat.Chat = chatId;
        userChat.user_id = this._currentUser.id;
        userChat.created_at = timestamp;
        userChat.updated_at = timestamp;
        this._chatContext.UserChat.add(userChat);
        this._chatContext.saveChanges();
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
      mediaFile.chat_id = parseInt(chatId, 10);
      mediaFile.message_id = null; // Initially null, will be set when message is sent
      mediaFile.created_at = Date.now().toString();
      mediaFile.updated_at = Date.now().toString();

      this._mediaContext.MediaFile.add(mediaFile);
      this._mediaContext.saveChanges();

      // Generate URL for the image
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
      const imageUrl = `${backendUrl}/bb-media/api/media/image/${mediaFile.id}`;

      return this.returnJson({
        success: true,
        file: {
          id: mediaFile.id,
          filename: mediaFile.filename,
          storedFilename: mediaFile.stored_filename,
          mimeType: mediaFile.mime_type,
          fileSize: mediaFile.file_size,
          formattedSize: this.mediaService.formatFileSize(mediaFile.file_size),
          createdAt: mediaFile.created_at,
          url: imageUrl
        },
        imageUrl: imageUrl,
        fileId: mediaFile.id,
        chatId: chatId, // Return chatId so frontend can navigate to it
        message: 'Image uploaded successfully'
      });

    } catch (error) {
      console.error('❌ Error uploading image:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Serve an image file by ID
   * GET /image/:id
   */
  async serveImage(obj) {
    try {
      const fileId = obj?.params?.id || obj?.params?.query?.id;

      if (!fileId) {
        return this.returnJson({
          success: false,
          error: 'File ID is required'
        });
      }

      // Get file from database
      const file = this._mediaContext.MediaFile
        .where(f => f.id == $$, parseInt(fileId, 10))
        .single();

      if (!file) {
        return this.returnJson({
          success: false,
          error: 'File not found'
        });
      }

      // Verify it's an image
      if (!file.mime_type || !file.mime_type.startsWith('image/')) {
        return this.returnJson({
          success: false,
          error: 'File is not an image'
        });
      }

      // Check if file exists
      const fs = require('fs');
      if (!fs.existsSync(file.file_path)) {
        return this.returnJson({
          success: false,
          error: 'Image file not found on disk'
        });
      }

      // Serve the image using MasterController returnFile() method
      return this.returnFile(file.file_path, {
        contentType: file.mime_type,
        disposition: 'inline',
        filename: file.filename
      });

    } catch (error) {
      console.error('❌ Error serving image:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get unsent images for a chat (images with chat_id but no message_id)
   * GET /unsent-images/:chatId
   */
  async getUnsentImages(obj) {
    try {
      const chatId = obj?.params?.chatid || obj?.params?.chatId;

      if (!chatId) {
        return this.returnJson({
          success: false,
          error: 'Chat ID is required'
        });
      }

      // Get images with chat_id but message_id IS NULL
      const unsentImages = this._mediaContext.MediaFile
        .where(f => f.chat_id == $$ && f.message_id == null, parseInt(chatId, 10))
        .toList();

      // Generate URLs for each image
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
      const images = unsentImages.map(file => ({
        id: file.id,
        filename: file.filename,
        url: `${backendUrl}/bb-media/api/media/image/${file.id}`,
        mimeType: file.mime_type,
        fileSize: file.file_size,
        createdAt: file.created_at
      }));

      return this.returnJson({
        success: true,
        images: images
      });

    } catch (error) {
      console.error('❌ Error getting unsent images:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Link images to a message (set message_id for images)
   * POST /link-images-to-message
   * Body: { imageIds: number[], messageId: number }
   */
  async linkImagesToMessage(obj) {
    try {
      const formData = obj?.params?.formData || obj?.params;
      const imageIds = formData?.imageIds || [];
      const messageId = formData?.messageId;

      if (!messageId) {
        return this.returnJson({
          success: false,
          error: 'Message ID is required'
        });
      }

      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return this.returnJson({
          success: false,
          error: 'Image IDs array is required'
        });
      }

      // Update all images with the message_id
      for (const imageId of imageIds) {
        const file = this._mediaContext.MediaFile
          .where(f => f.id == $$, parseInt(imageId, 10))
          .single();

        if (file) {
          file.message_id = parseInt(messageId, 10);
          file.updated_at = Date.now().toString();
        }
      }

      this._mediaContext.saveChanges();

      return this.returnJson({
        success: true,
        message: `Linked ${imageIds.length} images to message ${messageId}`
      });

    } catch (error) {
      console.error('❌ Error linking images to message:', error);
      return this.returnJson({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Analyze image with LLM
   * POST /analyze-image
   * Body: { imageId: number, prompt: string, model?: string }
   */
  async analyzeImage(obj) {
    try {
      const formData = obj?.params?.formData || obj?.params;
      const imageId = formData?.imageId;
      const prompt = formData?.prompt || 'Describe this image in detail.';
      const model = formData?.model || 'gpt-4-turbo';

      if (!imageId) {
        return this.returnJson({
          success: false,
          error: 'Image ID is required'
        });
      }

      // Get image from database
      const file = this._mediaContext.MediaFile
        .where(f => f.id == $$, parseInt(imageId, 10))
        .single();

      if (!file) {
        return this.returnJson({
          success: false,
          error: 'Image not found'
        });
      }

      // Verify it's an image
      if (!file.mime_type || !file.mime_type.startsWith('image/')) {
        return this.returnJson({
          success: false,
          error: 'File is not an image'
        });
      }

      // Generate image URL
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
      const imageUrl = `${backendUrl}/bb-media/api/media/image/${file.id}`;

      // Call LLM API with image URL
      const axios = require('axios');

      // Determine which API to use based on model
      let apiResponse;

      if (model.startsWith('gpt-')) {
        // OpenAI API
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          return this.returnJson({
            success: false,
            error: 'OpenAI API key not configured'
          });
        }

        apiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]
            }
          ],
          max_tokens: 1000
        }, {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        return this.returnJson({
          success: true,
          response: apiResponse.data.choices[0].message.content,
          model: model,
          usage: apiResponse.data.usage
        });

      } else if (model.startsWith('grok-')) {
        // Grok API (X.AI)
        const grokApiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
        if (!grokApiKey) {
          return this.returnJson({
            success: false,
            error: 'Grok API key not configured'
          });
        }

        apiResponse = await axios.post('https://api.x.ai/v1/chat/completions', {
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]
            }
          ],
          max_tokens: 1000
        }, {
          headers: {
            'Authorization': `Bearer ${grokApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        return this.returnJson({
          success: true,
          response: apiResponse.data.choices[0].message.content,
          model: model,
          usage: apiResponse.data.usage
        });

      } else {
        return this.returnJson({
          success: false,
          error: `Unsupported model: ${model}. Use gpt-4-turbo or grok-vision-beta`
        });
      }

    } catch (error) {
      console.error('❌ Error analyzing image:', error);
      return this.returnJson({
        success: false,
        error: error.response?.data?.error?.message || error.message
      });
    }
  }

  /**
   * Save generated image from LLM (OpenAI/Grok)
   * POST /save-generated-image
   * Body: {
   *   imageData: string (URL or base64),
   *   format: 'url' | 'base64',
   *   chatId: number,
   *   messageId: number,
   *   filename?: string,
   *   mimeType?: string
   * }
   */
  async saveGeneratedImage(obj) {
    try {
      const formData = obj?.params?.formData || obj?.params;
      const { imageData, format, chatId, messageId, filename, mimeType } = formData;

      console.log('💾 Saving generated image:', { format, chatId, messageId, filename });

      if (!imageData) {
        return this.returnJson({
          success: false,
          error: 'Image data is required'
        });
      }

      if (!chatId || !messageId) {
        return this.returnJson({
          success: false,
          error: 'Chat ID and Message ID are required'
        });
      }

      const fs = require('fs');
      const path = require('path');
      const axios = require('axios');

      let fileBuffer;
      let detectedMimeType = mimeType || 'image/png';
      let originalFilename = filename || `generated-${Date.now()}.png`;

      // Handle URL format
      if (format === 'url') {
        console.log('📥 Downloading image from URL...');
        const response = await axios.get(imageData, { responseType: 'arraybuffer' });
        fileBuffer = Buffer.from(response.data);

        // Try to detect mime type from response headers
        if (response.headers['content-type']) {
          detectedMimeType = response.headers['content-type'];
        }

        // Update filename extension based on mime type
        if (!filename) {
          const ext = detectedMimeType.split('/')[1] || 'png';
          originalFilename = `generated-${Date.now()}.${ext}`;
        }
      }
      // Handle base64 format
      else if (format === 'base64' || format === 'b64_json') {
        console.log('🔤 Decoding base64 image...');
        // Remove data URL prefix if present
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        fileBuffer = Buffer.from(base64Data, 'base64');

        // Try to detect mime type from data URL
        const mimeMatch = imageData.match(/^data:(image\/\w+);base64,/);
        if (mimeMatch) {
          detectedMimeType = mimeMatch[1];
        }

        // Update filename extension based on mime type
        if (!filename) {
          const ext = detectedMimeType.split('/')[1] || 'png';
          originalFilename = `generated-${Date.now()}.${ext}`;
        }
      } else {
        return this.returnJson({
          success: false,
          error: 'Invalid format. Must be "url" or "base64"'
        });
      }

      console.log('✅ Image data loaded, size:', fileBuffer.length, 'bytes');

      // Check storage limit
      const settings = this._mediaContext.MediaSettings.take(1).toList()[0];
      if (settings && settings.storage_enabled) {
        const storageStats = await this.mediaService.getStorageStats();
        const currentSizeMB = storageStats.totalSize / (1024 * 1024);
        const fileSizeMB = fileBuffer.length / (1024 * 1024);
        const limitMB = settings.storage_limit_mb || 1024;

        if (currentSizeMB + fileSizeMB > limitMB) {
          return this.returnJson({
            success: false,
            error: `Storage limit exceeded. Current: ${currentSizeMB.toFixed(2)}MB, File: ${fileSizeMB.toFixed(2)}MB, Limit: ${limitMB}MB`
          });
        }
      }

      // Save file to storage
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const ext = originalFilename.split('.').pop();
      const storedFilename = `${timestamp}-${randomString}.${ext}`;

      const storageDir = path.join(process.cwd(), 'bb-storage', 'media');
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      const filePath = path.join(storageDir, storedFilename);
      fs.writeFileSync(filePath, fileBuffer);
      const fileSize = fileBuffer.length;

      console.log('💾 Saved to:', filePath);

      // Create database record with chat_id and message_id
      const MediaFile = require('../../models/MediaFile');
      const mediaFile = new MediaFile();
      mediaFile.filename = originalFilename;
      mediaFile.stored_filename = storedFilename;
      mediaFile.file_path = filePath;
      mediaFile.mime_type = detectedMimeType;
      mediaFile.file_size = fileSize;
      mediaFile.uploaded_by = this._currentUser?.id || null;
      mediaFile.upload_source = 'llm'; // Mark as LLM-generated
      mediaFile.chat_id = parseInt(chatId, 10);
      mediaFile.message_id = parseInt(messageId, 10);
      mediaFile.created_at = timestamp.toString();
      mediaFile.updated_at = timestamp.toString();

      this._mediaContext.MediaFile.add(mediaFile);
      this._mediaContext.saveChanges();

      console.log('✅ Database record created, ID:', mediaFile.id);

      // Generate URL for the saved image
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
      const imageUrl = `${backendUrl}/bb-media/api/media/image/${mediaFile.id}`;

      return this.returnJson({
        success: true,
        file: {
          id: mediaFile.id,
          filename: mediaFile.filename,
          storedFilename: mediaFile.stored_filename,
          mimeType: mediaFile.mime_type,
          fileSize: mediaFile.file_size,
          formattedSize: this.mediaService.formatFileSize(mediaFile.file_size),
          chatId: mediaFile.chat_id,
          messageId: mediaFile.message_id,
          url: imageUrl,
          createdAt: mediaFile.created_at
        },
        imageUrl: imageUrl,
        message: 'Generated image saved successfully'
      });

    } catch (error) {
      console.error('❌ Error saving generated image:', error);
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
