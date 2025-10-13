const fs = require('fs').promises;
const path = require('path');


/**
 * FileStorageService - WordPress-style file management for RAG documents
 *
 * Manages uploaded documents in a tenant-isolated folder structure:
 * {configuredPath}/{tenantId}/{files}
 *
 * Features:
 * - Tenant-isolated storage
 * - Storage quota tracking
 * - Safe file operations
 * - Automatic directory creation
 * - Reads storage path from environment config
 */
class FileStorageService {
    constructor() {
        // Defer config loading to avoid circular dependencies during initialization
        this._storageRoot = null;
    }

    /**
     * Get storage root, lazily loading from config
     * @returns {string} - Storage root path
     */
    get storageRoot() {
        if (!this._storageRoot) {
            // Simple hardcoded path for now to avoid circular dependency issues
            // TODO: Load from config once master initialization is fixed
            this._storageRoot = path.join(process.cwd(), 'bb-storage', 'media');
            console.log(`📁 FileStorageService initialized with root: ${this._storageRoot}`);
        }
        return this._storageRoot;
    }

    /**
     * Get the storage folder for a specific tenant
     * @param {string} tenantId - Tenant identifier (user ID or org ID)
     * @returns {string} - Absolute path to tenant folder
     */
    getTenantFolder(tenantId) {
        // Sanitize tenant ID to prevent path traversal
        const safeTenantId = String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '_');
        return path.join(this.storageRoot, safeTenantId);
    }

    /**
     * Ensure tenant folder exists
     * @param {string} tenantId - Tenant identifier
     * @returns {Promise<string>} - Path to tenant folder
     */
    async ensureTenantFolder(tenantId) {
        const folderPath = this.getTenantFolder(tenantId);

        try {
            await fs.mkdir(folderPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw new Error(`Failed to create tenant folder: ${error.message}`);
            }
        }

        return folderPath;
    }

    /**
     * Move uploaded temp file to tenant's permanent storage
     * @param {string} tempPath - Temporary file path from multer/express
     * @param {string} tenantId - Tenant identifier
     * @param {string} filename - Destination filename
     * @returns {Promise<string>} - Final file path
     */
    async moveUploadToTenant(tempPath, tenantId, filename) {
        const tenantFolder = await this.ensureTenantFolder(tenantId);

        // Sanitize filename
        const safeFilename = this.sanitizeFilename(filename);
        const destPath = path.join(tenantFolder, safeFilename);

        // Check if file already exists, append timestamp if needed
        const finalPath = await this.getUniqueFilePath(destPath);

        try {
            await fs.rename(tempPath, finalPath);
        } catch (error) {
            // If rename fails (cross-device), fall back to copy + delete
            try {
                await fs.copyFile(tempPath, finalPath);
                await fs.unlink(tempPath);
            } catch (copyError) {
                throw new Error(`Failed to move file: ${copyError.message}`);
            }
        }

        return finalPath;
    }

    /**
     * Get a unique file path by appending timestamp if file exists
     * @param {string} filePath - Desired file path
     * @returns {Promise<string>} - Unique file path
     */
    async getUniqueFilePath(filePath) {
        try {
            await fs.access(filePath);
            // File exists, append timestamp
            const ext = path.extname(filePath);
            const base = path.basename(filePath, ext);
            const dir = path.dirname(filePath);
            const timestamp = Date.now();
            return path.join(dir, `${base}_${timestamp}${ext}`);
        } catch {
            // File doesn't exist, use original path
            return filePath;
        }
    }

    /**
     * Sanitize filename to prevent security issues
     * @param {string} filename - Original filename
     * @returns {string} - Safe filename
     */
    sanitizeFilename(filename) {
        // Remove path separators and dangerous characters
        return filename
            .replace(/[\/\\]/g, '_')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .substring(0, 255); // Limit length
    }

    /**
     * Delete a file from storage
     * @param {string} filePath - Absolute path to file
     * @returns {Promise<boolean>} - True if deleted, false if not found
     */
    async deleteFile(filePath) {
        try {
            await fs.unlink(filePath);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return false; // File not found
            }
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    /**
     * Calculate total storage used by a tenant (in bytes)
     * @param {string} tenantId - Tenant identifier
     * @returns {Promise<number>} - Total bytes used
     */
    async getTenantStorageUsage(tenantId) {
        const tenantFolder = this.getTenantFolder(tenantId);

        try {
            await fs.access(tenantFolder);
        } catch {
            return 0; // Folder doesn't exist yet
        }

        return await this.calculateFolderSize(tenantFolder);
    }

    /**
     * Recursively calculate folder size
     * @param {string} folderPath - Path to folder
     * @returns {Promise<number>} - Total bytes
     */
    async calculateFolderSize(folderPath) {
        let totalSize = 0;

        const walk = async (currentPath) => {
            try {
                const items = await fs.readdir(currentPath, { withFileTypes: true });

                for (const item of items) {
                    const itemPath = path.join(currentPath, item.name);

                    if (item.isDirectory()) {
                        await walk(itemPath);
                    } else if (item.isFile()) {
                        const stats = await fs.stat(itemPath);
                        totalSize += stats.size;
                    }
                }
            } catch (error) {
                console.error(`Error calculating size for ${currentPath}:`, error.message);
            }
        };

        await walk(folderPath);
        return totalSize;
    }

    /**
     * Convert bytes to megabytes
     * @param {number} bytes - Size in bytes
     * @returns {number} - Size in MB (rounded to 2 decimals)
     */
    bytesToMB(bytes) {
        return Math.round((bytes / (1024 * 1024)) * 100) / 100;
    }

    /**
     * Check if tenant has exceeded storage quota
     * @param {string} tenantId - Tenant identifier
     * @param {number} quotaMB - Quota in megabytes
     * @returns {Promise<object>} - { exceeded: boolean, usedMB: number, quotaMB: number }
     */
    async checkStorageQuota(tenantId, quotaMB = 1024) {
        const usedBytes = await this.getTenantStorageUsage(tenantId);
        const usedMB = this.bytesToMB(usedBytes);

        return {
            exceeded: usedMB >= quotaMB,
            usedMB,
            quotaMB,
            percentUsed: Math.round((usedMB / quotaMB) * 100)
        };
    }

    /**
     * List all files in tenant's storage
     * @param {string} tenantId - Tenant identifier
     * @returns {Promise<Array>} - Array of file info objects
     */
    async listTenantFiles(tenantId) {
        const tenantFolder = this.getTenantFolder(tenantId);

        try {
            await fs.access(tenantFolder);
        } catch {
            return []; // Folder doesn't exist
        }

        const items = await fs.readdir(tenantFolder, { withFileTypes: true });
        const files = [];

        for (const item of items) {
            if (item.isFile()) {
                const filePath = path.join(tenantFolder, item.name);
                const stats = await fs.stat(filePath);

                files.push({
                    filename: item.name,
                    path: filePath,
                    sizeBytes: stats.size,
                    sizeMB: this.bytesToMB(stats.size),
                    created: stats.birthtime,
                    modified: stats.mtime
                });
            }
        }

        return files;
    }

    /**
     * Check if a file exists
     * @param {string} filePath - Absolute path to file
     * @returns {Promise<boolean>} - True if exists
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
     * Get file info
     * @param {string} filePath - Absolute path to file
     * @returns {Promise<object>} - File stats
     */
    async getFileInfo(filePath) {
        const stats = await fs.stat(filePath);

        return {
            path: filePath,
            filename: path.basename(filePath),
            sizeBytes: stats.size,
            sizeMB: this.bytesToMB(stats.size),
            created: stats.birthtime,
            modified: stats.mtime,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory()
        };
    }
}

module.exports = FileStorageService;
