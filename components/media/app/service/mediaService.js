/**
 * Media Service
 * Handles file upload, storage, and management
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

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
}

module.exports = MediaService;
