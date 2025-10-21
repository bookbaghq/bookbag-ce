/**
 * Media Service
 * Handles file upload, storage, and management
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

class MediaService {
  constructor() {
    // Load config from environment
    const master = require('mastercontroller');
    const storagePath = master.env?.mediaStorage?.path || '/storage/media';

    // Resolve path relative to project root
    this.uploadDir = path.join(process.cwd(), storagePath);
    this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
  }

  /**
   * Generate unique filename
   */
  generateUniqueFilename(originalFilename) {
    const ext = path.extname(originalFilename);
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${randomString}${ext}`;
  }

  /**
   * Save uploaded file
   */
  async saveFile(tempPath, originalFilename) {
    const uniqueFilename = this.generateUniqueFilename(originalFilename);
    const finalPath = path.join(this.uploadDir, uniqueFilename);

    try {
      await fs.copyFile(tempPath, finalPath);
      await fs.unlink(tempPath); // Remove temp file

      return {
        storedFilename: uniqueFilename,
        filePath: finalPath
      };
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Get file size
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format file size to human readable
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {

      const files = await fs.readdir(this.uploadDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
        }
      }

      return {
        fileCount: files.length,
        totalSize: totalSize,
        formattedSize: this.formatFileSize(totalSize)
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        fileCount: 0,
        totalSize: 0,
        formattedSize: '0 Bytes'
      };
    }
  }

  /**
   * Get image URLs for a specific message
   * @param {number} messageId - Message ID to get images for
   * @param {object} mediaContext - Media context for database access
   * @param {string} baseUrl - Base URL for constructing image URLs (from request host)
   * @returns {Array<string>} Array of image URLs
   */
  getImageUrlsForMessage(messageId, mediaContext, baseUrl = null) {
    try {
      if (!mediaContext) {
        console.warn('mediaContext not provided to getImageUrlsForMessage');
        return [];
      }

      const linkedImages = mediaContext.MediaFile
        .where(f => f.message_id == $$, messageId)
        .toList();

      if (!linkedImages || linkedImages.length === 0) {
        return [];
      }

      // Use provided baseUrl, or warn and return relative URLs
      if (!baseUrl) {
        console.warn('⚠️  No baseUrl provided to getImageUrlsForMessage - using relative URLs');
        return linkedImages.map(file => `/bb-media/api/media/image/${file.id}`);
      }

      return linkedImages.map(file => `${baseUrl}/bb-media/api/media/image/${file.id}`);
    } catch (error) {
      console.error('Error getting image URLs for message:', error);
      return [];
    }
  }

  /**
   * Download image from URL
   * @param {string} url - Image URL to download
   * @returns {Promise<Buffer>} Image buffer
   */
  async downloadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  }

  /**
   * Save AI-generated image from URL
   * @param {string} imageUrl - URL of the generated image
   * @param {object} options - Options including messageId, chatId, mediaContext
   * @returns {Promise<object>} Saved file info with URL
   */
  async saveAIGeneratedImage(imageUrl, options = {}) {
    try {
      const { messageId, chatId, mediaContext, source = 'ai', vendor = 'unknown' } = options;

      console.log(`📥 Downloading AI-generated image from: ${imageUrl}`);

      // Download the image
      const imageBuffer = await this.downloadImageFromUrl(imageUrl);

      // Generate unique filename
      const ext = this.getExtensionFromUrl(imageUrl) || 'png';
      const uniqueFilename = `ai-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
      const filePath = path.join(this.uploadDir, uniqueFilename);

      // Save to disk
      await fs.writeFile(filePath, imageBuffer);
      console.log(`✅ Saved AI image to: ${filePath}`);

      // Create MediaFile record if mediaContext is provided
      if (mediaContext) {
        try {
          const fileSize = imageBuffer.length;
          // Note: URL will be relative until accessed through proper request context
          const backendUrl = process.env.BACKEND_URL || '';

          const mediaFile = mediaContext.MediaFile.create({
            filename: uniqueFilename,
            original_filename: `${source}-${vendor}-generated.${ext}`,
            mime_type: `image/${ext}`,
            size: fileSize,
            file_path: filePath,
            chat_id: chatId || null,
            message_id: messageId || null,
            source: source,
            vendor: vendor,
            original_url: imageUrl,
            created_at: new Date().toISOString()
          });

          await mediaFile.save();

          console.log(`✅ Created MediaFile record: ${mediaFile.id}`);

          return {
            fileId: mediaFile.id,
            filename: uniqueFilename,
            filePath: filePath,
            url: `${backendUrl}/bb-media/api/media/image/${mediaFile.id}`,
            originalUrl: imageUrl,
            size: fileSize
          };
        } catch (dbError) {
          console.error('Failed to create MediaFile record:', dbError);
          const backendUrl = process.env.BACKEND_URL || '';
          return {
            filename: uniqueFilename,
            filePath: filePath,
            url: backendUrl ? `${backendUrl}/bb-media/api/media/file/${uniqueFilename}` : `/bb-media/api/media/file/${uniqueFilename}`,
            originalUrl: imageUrl,
            size: imageBuffer.length
          };
        }
      }

      const backendUrl = process.env.BACKEND_URL || '';
      return {
        filename: uniqueFilename,
        filePath: filePath,
        url: backendUrl ? `${backendUrl}/bb-media/api/media/file/${uniqueFilename}` : `/bb-media/api/media/file/${uniqueFilename}`,
        originalUrl: imageUrl,
        size: imageBuffer.length
      };
    } catch (error) {
      console.error('Error saving AI-generated image:', error);
      throw error;
    }
  }

  /**
   * Save base64-encoded image
   * @param {string} base64Data - Base64-encoded image data
   * @param {object} options - Options including messageId, chatId, mediaContext
   * @returns {Promise<object>} Saved file info with URL
   */
  async saveBase64Image(base64Data, options = {}) {
    try {
      const { messageId, chatId, mediaContext, source = 'ai', vendor = 'unknown', ext = 'png' } = options;

      console.log(`💾 Saving base64 image (${base64Data.length} chars)`);

      const imageBuffer = Buffer.from(base64Data, 'base64');
      const uniqueFilename = `ai-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
      const filePath = path.join(this.uploadDir, uniqueFilename);

      await fs.writeFile(filePath, imageBuffer);
      console.log(`✅ Saved base64 image to: ${filePath}`);

      if (mediaContext) {
        try {
          const fileSize = imageBuffer.length;
          const backendUrl = process.env.BACKEND_URL || '';

          const mediaFile = mediaContext.MediaFile.create({
            filename: uniqueFilename,
            original_filename: `${source}-${vendor}-generated.${ext}`,
            mime_type: `image/${ext}`,
            size: fileSize,
            file_path: filePath,
            chat_id: chatId || null,
            message_id: messageId || null,
            source: source,
            vendor: vendor,
            created_at: new Date().toISOString()
          });

          await mediaFile.save();

          return {
            fileId: mediaFile.id,
            filename: uniqueFilename,
            filePath: filePath,
            url: `${backendUrl}/bb-media/api/media/image/${mediaFile.id}`,
            size: fileSize
          };
        } catch (dbError) {
          console.error('Failed to create MediaFile record:', dbError);
          const backendUrl = process.env.BACKEND_URL || '';
          return {
            filename: uniqueFilename,
            filePath: filePath,
            url: backendUrl ? `${backendUrl}/bb-media/api/media/file/${uniqueFilename}` : `/bb-media/api/media/file/${uniqueFilename}`,
            size: imageBuffer.length
          };
        }
      }

      const backendUrl = process.env.BACKEND_URL || '';
      return {
        filename: uniqueFilename,
        filePath: filePath,
        url: backendUrl ? `${backendUrl}/bb-media/api/media/file/${uniqueFilename}` : `/bb-media/api/media/file/${uniqueFilename}`,
        size: imageBuffer.length
      };
    } catch (error) {
      console.error('Error saving base64 image:', error);
      throw error;
    }
  }

  /**
   * Extract file extension from URL
   * @param {string} url - URL to extract extension from
   * @returns {string|null} File extension without dot
   */
  getExtensionFromUrl(url) {
    try {
      const urlPath = new URL(url).pathname;
      const ext = path.extname(urlPath).slice(1).toLowerCase();
      const validExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
      return validExts.includes(ext) ? ext : 'png';
    } catch {
      return 'png';
    }
  }
}

module.exports = MediaService;
