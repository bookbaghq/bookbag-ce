const master = require('mastercontroller');

/**
 * RAG Controller - Knowledge Base Management
 *
 * Routes:
 * - POST /ingest - Upload and ingest a document
 * - GET /list - List documents for tenant
 * - DELETE /delete/:id - Delete a document
 * - POST /query - Query knowledge base
 * - GET /storage/usage - Get storage usage stats
 */
class ragController {
    constructor(req) {
        try {
            this._currentUser = req.authService.currentUser(req.request, req.userContext);
            this._ragContext = req.ragContext;
            this._chatContext = req.chatContext; // Add chat context for chat creation
            this._mediaContext = req.mediaContext; // Add media context for settings

            // Lazy load services using relative paths
            const FileStorageService = require('../../service/fileStorageService');
            const RAGService = require('../../service/ragService');
            const TextExtractorService = require('../../service/textExtractorService');

            this.fileService = new FileStorageService();
            this.ragService = new RAGService(this._ragContext);
            this.textExtractor = new TextExtractorService();

            console.log('✓ ragController initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing ragController:', error);
            throw error;
        }
    }

    /**
     * Get RAG settings
     * @returns {object} - Settings object with disable flags
     */
    getRAGSettings() {
        try {
            let settings = this._ragContext.Settings.single();

            if (!settings) {
                // Return default settings if none exist
                return {
                    disable_rag: false,
                    disable_rag_chat: false,
                    disable_rag_workspace: false
                };
            }

            return {
                disable_rag: settings.disable_rag || false,
                disable_rag_chat: settings.disable_rag_chat || false,
                disable_rag_workspace: settings.disable_rag_workspace || false
            };
        } catch (error) {
            console.error('❌ Error getting RAG settings:', error);
            // Return safe defaults on error
            return {
                disable_rag: false,
                disable_rag_chat: false,
                disable_rag_workspace: false
            };
        }
    }

    /**
     * Check if RAG is disabled for a specific chat
     * @param {number} chatId - Chat ID to check
     * @returns {object} - { disabled: boolean, reason: string }
     */
    checkRAGDisabled(chatId = null, workspaceId = null) {
        const settings = this.getRAGSettings();

        // Check if RAG is globally disabled
        if (settings.disable_rag) {
            return { disabled: true, reason: 'RAG system is disabled' };
        }

        // If it's a workspace document (workspaceId provided, no chatId)
        if (workspaceId && !chatId) {
            if (settings.disable_rag_workspace) {
                return { disabled: true, reason: 'RAG for workspaces is disabled' };
            }
            return { disabled: false };
        }

        // If it's a chat document (chatId provided)
        if (chatId) {
            // Get chat to check if it's workspace-created
            const chat = this._chatContext.Chat
                .where(c => c.id == $$, parseInt(chatId, 10))
                .single();

            if (!chat) {
                return { disabled: true, reason: 'Chat not found' };
            }

            // Workspace-created chats bypass the disable_rag_chat setting
            if (chat.is_workspace_created) {
                // Only check if workspace RAG is disabled
                if (settings.disable_rag_workspace) {
                    return { disabled: true, reason: 'RAG for workspaces is disabled' };
                }
                return { disabled: false };
            } else {
                // Non-workspace chats check the disable_rag_chat setting
                if (settings.disable_rag_chat) {
                    return { disabled: true, reason: 'RAG for chats is disabled' };
                }
                return { disabled: false };
            }
        }

        return { disabled: false };
    }

    /**
     * Get tenant ID from current user
     * @returns {string} - Tenant identifier
     */
    getTenantId() {
        // Use user ID as tenant ID (can be changed to org ID if needed)
        return String(this._currentUser?.id || 'default');
    }

    /**
     * Get storage limit from MediaSettings
     * @returns {number} - Storage limit in MB
     */
    getStorageLimit() {
        try {
            const settings = this._mediaContext.MediaSettings.take(1).toList()[0];
            return settings?.storage_limit_mb || 1024; // Default to 1GB if not set
        } catch (error) {
            console.warn('⚠️  Could not get storage limit from settings, using default 1024MB');
            return 1024;
        }
    }

    /**
     * Get storage usage for tenant
     * GET /storage/usage?tenantId=xxx
     */
    async getStorageUsage(obj) {
        try {
            const tenantId = obj?.params?.query?.tenantId || this.getTenantId();

            const usageBytes = await this.fileService.getTenantStorageUsage(tenantId);
            const usageMB = this.fileService.bytesToMB(usageBytes);

            // Get storage limit from MediaSettings
            const storageLimit = this.getStorageLimit();
            const quota = await this.fileService.checkStorageQuota(tenantId, storageLimit);

            return this.returnJson({
                success: true,
                mb: usageMB,
                bytes: usageBytes,
                quota: quota.quotaMB,
                percentUsed: quota.percentUsed,
                exceeded: quota.exceeded
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
     * Ingest content from a URL
     * POST /ingest-url
     * Body: { url: string, tenantId?: string }
     */
    async ingestUrl(obj) {
        try {
            const formData = obj?.params?.formData || obj?.params;
            const tenantId = formData?.tenantId || this.getTenantId();
            const url = formData?.url;

            if (!url) {
                return this.returnJson({
                    success: false,
                    error: 'URL is required'
                });
            }

            // Validate URL format
            try {
                new URL(url);
            } catch (e) {
                return this.returnJson({
                    success: false,
                    error: 'Invalid URL format'
                });
            }

            // Check storage quota before proceeding
            const storageLimit = this.getStorageLimit();
            const quota = await this.fileService.checkStorageQuota(tenantId, storageLimit);
            if (quota.exceeded) {
                return this.returnJson({
                    success: false,
                    error: `Storage quota exceeded (${quota.usedMB}MB / ${quota.quotaMB}MB)`
                });
            }

            console.log(`📡 Fetching content from URL: ${url}`);

            // Fetch content from URL
            const https = require('https');
            const http = require('http');
            const urlModule = require('url');
            const parsedUrl = urlModule.parse(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            const content = await new Promise((resolve, reject) => {
                protocol.get(url, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => resolve(data));
                }).on('error', reject);
            });

            // Simple HTML to text conversion (remove tags)
            let text = content
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (!text || text.length < 50) {
                return this.returnJson({
                    success: false,
                    error: 'Could not extract meaningful content from URL'
                });
            }

            // Create a filename from URL
            const urlObj = new URL(url);
            const filename = `${urlObj.hostname}${urlObj.pathname}`.replace(/[^a-zA-Z0-9.-]/g, '_') + '.txt';

            // Ingest into RAG system - no file storage, only chunks
            const documentId = await this.ragService.ingestDocument({
                tenantId,
                title: urlObj.hostname + urlObj.pathname,
                filename: filename,
                filePath: '', // No file stored - only chunks in database
                text,
                mimeType: 'text/plain',
                fileSize: text.length // Approximate file size based on text length
            });

            return this.returnJson({
                success: true,
                documentId,
                message: 'URL content ingested successfully'
            });

        } catch (error) {
            console.error('❌ Error ingesting URL:', error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Ingest a new document
     * POST /ingest
     * Requires multipart/form-data with 'file' field
     * Body: { file: File, chatId?: number, workspaceId?: number, title?: string }
     * If chatId is not provided, a new chat will be created
     */
    async ingestDocument(obj) {
        try {
            console.log('🔍 ingestDocument called with obj:', {
                hasCurrentUser: !!this._currentUser,
                userId: this._currentUser?.id,
                hasParams: !!obj?.params,
                hasFormData: !!obj?.params?.formData
            });

            if (!this._currentUser || !this._currentUser.id) {
                console.log('❌ User not authenticated');
                return this.returnJson({
                    success: false,
                    error: 'User not authenticated'
                });
            }

            const formData = obj?.params?.formData || obj?.params;

            const tenantId = formData?.fields?.tenantId || formData?.tenantId || this.getTenantId();
            let chatId = formData?.fields?.chatId || formData?.chatId || null;
            let workspaceId = formData?.fields?.workspaceId || formData?.workspaceId || null;

            // Check if RAG is disabled
            const ragCheck = this.checkRAGDisabled(chatId, workspaceId);
            if (ragCheck.disabled) {
                return this.returnJson({
                    success: false,
                    error: ragCheck.reason
                });
            }

            // Parse chatId if it's a string
            if (chatId && typeof chatId === 'string') {
                chatId = parseInt(chatId, 10);
            }

            // Parse workspaceId if it's a string
            if (workspaceId && typeof workspaceId === 'string') {
                workspaceId = parseInt(workspaceId, 10);
            }

            // Check if file was uploaded - handle multiple possible structures
            let file = null;

            // Check for single file in different locations
            if (obj.request?.file) {
                file = obj.request.file;
            } else if (formData?.file) {
                file = formData.file;
            } else if (formData?.files?.file) {
                // Handle formData.files.file structure
                const fileUpload = formData.files.file;
                file = Array.isArray(fileUpload) ? fileUpload[0] : fileUpload;
            } else if (formData?.files) {
                // Handle formData.files['file'] or any other field name
                const fileKeys = Object.keys(formData.files);
                if (fileKeys.length > 0) {
                    const firstFile = formData.files[fileKeys[0]];
                    file = Array.isArray(firstFile) ? firstFile[0] : firstFile;
                }
            }

            if (!file) {
                console.log('❌ No file found in request');
                return this.returnJson({
                    success: false,
                    error: 'No file uploaded'
                });
            }

            // Debug: Log full file object to see what properties are available
            console.log('✓ File found, properties:', Object.keys(file));
            console.log('  Full file object:', JSON.stringify(file, null, 2));

            const originalName = file.originalname || file.originalFilename || file.name;
            const tempPath = file.filepath || file.path || file.tempFilePath;
            const mimeType = file.mimetype || file.type;

            if (!tempPath) {
                console.log('❌ No temp path found in file object');
                return this.returnJson({
                    success: false,
                    error: 'File upload incomplete - no temporary path'
                });
            }

            if (!originalName) {
                console.log('❌ No original filename found in file object');
                return this.returnJson({
                    success: false,
                    error: 'File upload incomplete - no filename'
                });
            }

            // Get file extension from original filename
            const path = require('path');
            const fileExt = path.extname(originalName).toLowerCase();

            // Check if file type is supported
            if (!this.textExtractor.isSupported(originalName)) {
                return this.returnJson({
                    success: false,
                    error: `Unsupported file type: ${fileExt}. ${this.textExtractor.getSupportedFormatsString()}`
                });
            }

            // Get file size from temp file
            const fs = require('fs').promises;
            let fileSize = 0;
            try {
                const stats = await fs.stat(tempPath);
                fileSize = stats.size;
            } catch (err) {
                console.warn('⚠️  Could not get file size:', err.message);
            }

            // Create a temp file with the correct extension for the text extractor
            // The text extractor relies on file extensions to determine how to parse
            const tempPathWithExt = `${tempPath}${fileExt}`;
            try {
                await fs.copyFile(tempPath, tempPathWithExt);
                console.log(`✓ Created temp file with extension: ${tempPathWithExt}`);
            } catch (copyError) {
                console.error('❌ Failed to create temp file with extension:', copyError.message);
                await this.fileService.deleteFile(tempPath);
                return this.returnJson({
                    success: false,
                    error: 'Failed to process file'
                });
            }

            // Extract text from temp file using TextExtractor service
            let text = '';

            try {
                text = await this.textExtractor.extract(tempPathWithExt, mimeType);
            } catch (extractError) {
                console.error('❌ Text extraction failed:', extractError.message);
                // Clean up both temp files if extraction fails
                await this.fileService.deleteFile(tempPath);
                await this.fileService.deleteFile(tempPathWithExt);

                return this.returnJson({
                    success: false,
                    error: `Failed to extract text from file: ${extractError.message}`,
                    supportedFormats: this.textExtractor.getSupportedFormatsString()
                });
            }

            // Delete both temp files after successful extraction
            try {
                await this.fileService.deleteFile(tempPath);
                await this.fileService.deleteFile(tempPathWithExt);
                console.log('✓ Deleted temp files after text extraction');
            } catch (deleteError) {
                console.warn('⚠️  Could not delete temp files:', deleteError.message);
                // Continue anyway - text extraction succeeded
            }

            // If chatId is not provided AND no workspaceId, create a new chat (like message sending does)
            // If workspaceId is provided, skip chat creation (workspace-level document)
            if (!chatId && !workspaceId) {
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
                chat.title = `Knowledge Base: ${formData?.fields?.title || formData?.title || originalName}`;

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
            } else if (workspaceId && !chatId) {
                console.log(`✓ Uploading workspace-level document (workspaceId: ${workspaceId}, no chatId)`);
            }

            // Ingest into RAG system with chatId and/or workspaceId
            // Note: filePath is set to empty string since we don't store files, only chunks
            const documentId = await this.ragService.ingestDocument({
                chatId,
                workspaceId,
                tenantId,
                title: formData?.fields?.title || formData?.title || originalName,
                filename: originalName,
                filePath: '', // No file stored - only chunks in database
                text,
                mimeType,
                fileSize
            });

            return this.returnJson({
                success: true,
                documentId,
                chatId, // Return chatId so frontend can navigate to it
                message: 'Document ingested successfully'
            });

        } catch (error) {
            console.error('❌ Error ingesting document:', error);
            console.error('Stack trace:', error.stack);

            // Return a proper JSON response even on error
            const errorResponse = {
                success: false,
                error: error.message || 'Unknown error occurred',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            };

            return this.returnJson(errorResponse);
        }
    }

    /**
     * List ALL documents for admin panel
     * GET /admin/list
     */
    async listAllDocuments(obj) {
        try {
            const search = obj?.params?.query?.search || '';

            // Get all documents
            let documents = this._ragContext.Document.toList();

            // Filter by search term if provided
            if (search) {
                const searchLower = search.toLowerCase();
                documents = documents.filter(doc =>
                    (doc.title && doc.title.toLowerCase().includes(searchLower)) ||
                    (doc.filename && doc.filename.toLowerCase().includes(searchLower))
                );
            }

            // Sort by creation date (newest first)
            documents.sort((a, b) => b.created_at - a.created_at);

            // Get chunk counts for each document
            const results = documents.map(doc => {
                const chunks = this._ragContext.DocumentChunk
                    .where(c => c.document_id == $$, doc.id)
                    .toList();

                let chatTitle = null;
                let workspaceName = null;

                // Get associated chat or workspace info
                if (doc.chat_id) {
                    try {
                        const chat = this._chatContext.Chat
                            .where(c => c.id == $$, doc.chat_id)
                            .single();
                        chatTitle = chat?.title || `Chat ${doc.chat_id}`;
                    } catch (e) {
                        chatTitle = `Chat ${doc.chat_id}`;
                    }
                }

                if (doc.workspace_id) {
                    workspaceName = `Workspace ${doc.workspace_id}`;
                }

                return {
                    id: doc.id,
                    title: doc.title,
                    filename: doc.filename,
                    mimeType: doc.mime_type,
                    fileSize: doc.file_size || 0,
                    chatId: doc.chat_id,
                    chatTitle: chatTitle,
                    workspaceId: doc.workspace_id,
                    workspaceName: workspaceName,
                    chunkCount: chunks.length,
                    createdAt: doc.created_at,
                    updatedAt: doc.updated_at
                };
            });

            return this.returnJson({
                success: true,
                documents: results,
                total: results.length
            });

        } catch (error) {
            console.error('❌ Error listing all documents:', error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * List all documents for a chat or workspace
     * GET /list?chatId=xxx OR /list?workspaceId=xxx
     */
    async listDocuments(obj) {
        try {
            const chatId = obj?.params?.query?.chatId;
            const workspaceId = obj?.params?.query?.workspaceId;

            if (!chatId && !workspaceId) {
                return this.returnJson({
                    success: false,
                    error: 'chatId or workspaceId is required'
                });
            }

            if (!this._currentUser || !this._currentUser.id) {
                return this.returnJson({
                    success: false,
                    error: 'User not authenticated'
                });
            }

            // Check if RAG is disabled
            const ragCheck = this.checkRAGDisabled(chatId, workspaceId);
            if (ragCheck.disabled) {
                // Return empty list when disabled
                return this.returnJson({
                    success: true,
                    documents: [],
                    disabled: true,
                    reason: ragCheck.reason
                });
            }

            // Verify user has access
            if (chatId) {
                const membership = this._chatContext.UserChat
                    .where(uc => uc.chat_id == $$ && uc.user_id == $$, parseInt(chatId, 10), this._currentUser.id)
                    .single();

                if (!membership) {
                    return this.returnJson({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const documents = this._ragContext.Document
                    .where(d => d.chat_id == $$, parseInt(chatId, 10))
                    .toList()
                    .sort((a, b) => b.created_at - a.created_at);

                const results = documents.map(doc => ({
                    id: doc.id,
                    title: doc.title,
                    filename: doc.filename,
                    mimeType: doc.mime_type,
                    createdAt: doc.created_at,
                    updatedAt: doc.updated_at
                }));

                return this.returnJson({
                    success: true,
                    documents: results
                });
            }

            if (workspaceId) {
                // For workspace, verify user is a member (admin only for now)
                const documents = this._ragContext.Document
                    .where(d => d.workspace_id == $$, parseInt(workspaceId, 10))
                    .toList()
                    .sort((a, b) => b.created_at - a.created_at);

                const results = documents.map(doc => ({
                    id: doc.id,
                    title: doc.title,
                    filename: doc.filename,
                    mimeType: doc.mime_type,
                    createdAt: doc.created_at,
                    updatedAt: doc.updated_at
                }));

                return this.returnJson({
                    success: true,
                    documents: results
                });
            }

        } catch (error) {
            console.error('❌ Error listing documents:', error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Delete a document and its chunks
     * DELETE /delete/:id
     */
    async deleteDocument(obj) {
        try {
            const documentId = obj?.params?.id || obj?.params?.query?.id;

            if (!documentId) {
                return this.returnJson({
                    success: false,
                    error: 'Document ID is required'
                });
            }

            // Get document
            const document = this._ragContext.Document
                .where(d => d.id == $$, documentId)
                .single();

            if (!document) {
                return this.returnJson({
                    success: false,
                    error: 'Document not found'
                });
            }

            // Verify user has access to the chat containing this document
            if (document.chat_id) {
                const membership = this._chatContext.UserChat
                    .where(uc => uc.chat_id == $$ && uc.user_id == $$, document.chat_id, this._currentUser.id)
                    .single();

                if (!membership) {
                    return this.returnJson({
                        success: false,
                        error: 'Unauthorized'
                    });
                }
            } else {
                // Legacy: Fall back to tenant_id check if chat_id is null
                const tenantId = this.getTenantId();
                if (document.tenant_id && document.tenant_id !== tenantId) {
                    return this.returnJson({
                        success: false,
                        error: 'Unauthorized'
                    });
                }
            }

            // No need to delete files - we don't store them anymore, only chunks

            // Delete all chunks
            await this.ragService.deleteDocumentChunks(documentId);

            // Delete document record
            this._ragContext.Document.remove(document);
            this._ragContext.saveChanges();

            return this.returnJson({
                success: true,
                message: 'Document deleted successfully'
            });

        } catch (error) {
            console.error('❌ Error deleting document:', error);
            console.error('Stack trace:', error.stack);

            // Return a proper JSON response even on error
            const errorResponse = {
                success: false,
                error: error.message || 'Unknown error occurred',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            };

            return this.returnJson(errorResponse);
        }
    }

    /**
     * Query knowledge base
     * POST /query
     * Body: { chatId: number, question: string, k?: number }
     */
    async queryKnowledgeBase(obj) {
        try {
            const formData = obj?.params?.formData || obj?.params;
            const chatId = formData?.chatId;
            const question = formData?.question;
            const k = parseInt(formData?.k || 5, 10);

            if (!chatId) {
                return this.returnJson({
                    success: false,
                    error: 'chatId is required'
                });
            }

            if (!question) {
                return this.returnJson({
                    success: false,
                    error: 'Question is required'
                });
            }

            if (!this._currentUser || !this._currentUser.id) {
                return this.returnJson({
                    success: false,
                    error: 'User not authenticated'
                });
            }

            // Verify user has access to this chat
            const membership = this._chatContext.UserChat
                .where(uc => uc.chat_id == $$ && uc.user_id == $$, parseInt(chatId, 10), this._currentUser.id)
                .single();

            if (!membership) {
                return this.returnJson({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            // Query RAG system
            const results = await this.ragService.queryRAG(parseInt(chatId, 10), question, k);

            // Build context string
            const context = this.ragService.buildContextString(results);

            return this.returnJson({
                success: true,
                results,
                context,
                count: results.length
            });

        } catch (error) {
            console.error('❌ Error querying knowledge base:', error);
            return this.returnJson({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get statistics for a chat or workspace's knowledge base
     * GET /stats?chatId=xxx OR /stats?workspaceId=xxx
     */
    async getStats(obj) {
        try {
            const chatId = obj?.params?.query?.chatId;
            const workspaceId = obj?.params?.query?.workspaceId;

            if (!chatId && !workspaceId) {
                return this.returnJson({
                    success: false,
                    error: 'chatId or workspaceId is required'
                });
            }

            if (!this._currentUser || !this._currentUser.id) {
                return this.returnJson({
                    success: false,
                    error: 'User not authenticated'
                });
            }

            // Check if RAG is disabled
            const ragCheck = this.checkRAGDisabled(chatId, workspaceId);
            if (ragCheck.disabled) {
                // Return zero stats when disabled
                return this.returnJson({
                    success: true,
                    stats: {
                        documentCount: 0,
                        chunkCount: 0,
                        totalTokens: 0,
                        avgChunksPerDoc: 0
                    },
                    disabled: true,
                    reason: ragCheck.reason
                });
            }

            if (chatId) {
                // Verify user has access to this chat
                const membership = this._chatContext.UserChat
                    .where(uc => uc.chat_id == $$ && uc.user_id == $$, parseInt(chatId, 10), this._currentUser.id)
                    .single();

                if (!membership) {
                    return this.returnJson({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const stats = await this.ragService.getChatStats(parseInt(chatId, 10));

                return this.returnJson({
                    success: true,
                    stats
                });
            }

            if (workspaceId) {
                // Get workspace stats
                const documents = this._ragContext.Document
                    .where(d => d.workspace_id == $$, parseInt(workspaceId, 10))
                    .toList();

                let chunkCount = 0;
                let totalTokens = 0;

                for (const doc of documents) {
                    const docChunks = this._ragContext.DocumentChunk
                        .where(c => c.document_id == $$, doc.id)
                        .toList();
                    chunkCount += docChunks.length;
                    totalTokens += docChunks.reduce((sum, chunk) => sum + (chunk.token_count || 0), 0);
                }

                const stats = {
                    documentCount: documents.length,
                    chunkCount: chunkCount,
                    totalTokens: totalTokens,
                    avgChunksPerDoc: documents.length > 0 ? Math.round(chunkCount / documents.length) : 0
                };

                return this.returnJson({
                    success: true,
                    stats
                });
            }

        } catch (error) {
            console.error('❌ Error getting stats:', error);
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

module.exports = ragController;
