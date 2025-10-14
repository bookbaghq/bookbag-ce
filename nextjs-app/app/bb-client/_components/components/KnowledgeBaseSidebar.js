'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Upload, File, Trash2, Database, ChevronLeft, ChevronRight, Plus, Link as LinkIcon, FileText, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import api from '@/apiConfig.json';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || api.ApiConfig.main;

/**
 * KnowledgeBaseSidebar - Document management interface
 *
 * Features:
 * - Upload documents
 * - View document list
 * - Delete documents
 * - Creates chat if none exists when uploading
 */
export function KnowledgeBaseSidebar({ chatId = null, isWorkspaceCreated = false }) {
  const router = useRouter();
  const pathname = usePathname();

  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({ documentCount: 0, chunkCount: 0 });
  const [uploading, setUploading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('file'); // 'file' or 'url'

  // RAG settings state
  const [ragSettings, setRagSettings] = useState({
    disableRag: false,
    disableRagChat: false,
    disableRagWorkspace: false
  });
  const [ragDisabled, setRagDisabled] = useState(false);

  // Multiple file support
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Multiple URL support
  const [urls, setUrls] = useState(['']);

  // Upload results tracking
  const [uploadResults, setUploadResults] = useState(null); // { success: [], failed: [] }
  const [validationError, setValidationError] = useState('');

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  // Fetch RAG settings on mount
  useEffect(() => {
    fetchRAGSettings();
  }, []);

  // Check if RAG should be disabled based on settings
  useEffect(() => {
    // If RAG is globally disabled, hide everything
    if (ragSettings.disableRag) {
      setRagDisabled(true);
      return;
    }

    // If workspace RAG is disabled and this is a workspace chat, hide
    if (ragSettings.disableRagWorkspace && isWorkspaceCreated) {
      setRagDisabled(true);
      return;
    }

    // If chat RAG is disabled and this is NOT a workspace chat, hide
    if (ragSettings.disableRagChat && !isWorkspaceCreated) {
      setRagDisabled(true);
      return;
    }

    setRagDisabled(false);
  }, [ragSettings, isWorkspaceCreated]);

  // Fetch documents and stats on mount
  useEffect(() => {
    if (chatId && !ragDisabled) {
      refreshData();
    }
  }, [chatId, ragDisabled]);

  const fetchRAGSettings = async () => {
    try {
      const response = await fetch(`${BASE_URL}/bb-rag/api/rag/settings`, {
        credentials: 'include'
      });

      if (!response.ok) {
        console.error('Error fetching RAG settings: HTTP', response.status);
        return;
      }

      const data = await response.json();

      if (data.success && data.settings) {
        setRagSettings({
          disableRag: !!data.settings.disableRag,
          disableRagChat: !!data.settings.disableRagChat,
          disableRagWorkspace: !!data.settings.disableRagWorkspace
        });
      }
    } catch (error) {
      console.error('Error fetching RAG settings:', error);
    }
  };

  const refreshData = async () => {
    if (!chatId) return;
    await Promise.all([
      fetchDocuments(),
      fetchStats()
    ]);
  };

  const fetchDocuments = async () => {
    if (!chatId) return;
    try {
      const response = await fetch(`${BASE_URL}/bb-rag/api/rag/list?chatId=${chatId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        console.error('Error fetching documents: HTTP', response.status);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents || []);
      } else {
        console.error('Error fetching documents:', data.error);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchStats = async () => {
    if (!chatId) return;
    try {
      const response = await fetch(`${BASE_URL}/bb-rag/api/rag/stats?chatId=${chatId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        console.error('Error fetching stats: HTTP', response.status);
        return;
      }

      const data = await response.json();

      if (data.success && data.stats) {
        setStats(data.stats);
      } else {
        console.error('Error fetching stats:', data.error);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addUrlField = () => {
    setUrls(prev => [...prev, '']);
  };

  const updateUrl = (index, value) => {
    setUrls(prev => prev.map((url, i) => i === index ? value : url));
  };

  const removeUrl = (index) => {
    if (urls.length > 1) {
      setUrls(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    // Clear previous results and errors
    setUploadResults(null);
    setValidationError('');

    if (modalMode === 'file' && selectedFiles.length === 0) {
      setValidationError('Please select at least one file');
      return;
    }

    if (modalMode === 'url') {
      const validUrls = urls.filter(u => u.trim());
      if (validUrls.length === 0) {
        setValidationError('Please enter at least one URL');
        return;
      }

      // Validate all URLs
      for (const url of validUrls) {
        try {
          new URL(url);
        } catch (e) {
          setValidationError(`Invalid URL: ${url}`);
          return;
        }
      }
    }

    setUploading(true);

    try {
      let newChatId = chatId; // Track if a new chat was created

      if (modalMode === 'file') {
        // Upload multiple files
        const successList = [];
        const failedList = [];

        for (const file of selectedFiles) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            if (chatId) {
              formData.append('chatId', chatId);
            }
            formData.append('title', file.name);

            const response = await fetch(`${BASE_URL}/bb-rag/api/rag/ingest`, {
              method: 'POST',
              body: formData,
              credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
              successList.push({ name: file.name, type: 'file' });
              // If a chat was created, navigate to it on first successful upload
              if (data.chatId && !newChatId) {
                newChatId = data.chatId;
              }
            } else {
              failedList.push({ name: file.name, type: 'file', error: data.error || 'Unknown error' });
              console.error(`Failed to upload ${file.name}:`, data.error);
            }
          } catch (error) {
            failedList.push({ name: file.name, type: 'file', error: error.message || 'Network error' });
            console.error(`Error uploading ${file.name}:`, error);
          }
        }

        setUploadResults({ success: successList, failed: failedList });
        setSelectedFiles([]);

        // Navigate to new chat if one was created
        if (newChatId && !chatId) {
          toast.success('Chat created! Navigating...');
          router.push(`/bb-client/${newChatId}`);
        } else if (chatId) {
          await refreshData();
        }
      } else {
        // Upload multiple URLs
        const validUrls = urls.filter(u => u.trim());
        const successList = [];
        const failedList = [];

        for (const url of validUrls) {
          try {
            const response = await fetch(`${BASE_URL}/bb-rag/api/rag/ingest-url`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                chatId,
                url: url.trim()
              }),
              credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
              successList.push({ name: url, type: 'url' });
              // If a chat was created, navigate to it on first successful upload
              if (data.chatId && !newChatId) {
                newChatId = data.chatId;
              }
            } else {
              failedList.push({ name: url, type: 'url', error: data.error || 'Unknown error' });
              console.error(`Failed to add ${url}:`, data.error);
            }
          } catch (error) {
            failedList.push({ name: url, type: 'url', error: error.message || 'Network error' });
            console.error(`Error adding ${url}:`, error);
          }
        }

        setUploadResults({ success: successList, failed: failedList });
        setUrls(['']);

        // Navigate to new chat if one was created
        if (newChatId && !chatId) {
          toast.success('Chat created! Navigating...');
          router.push(`/bb-client/${newChatId}`);
        } else if (chatId) {
          await refreshData();
        }
      }
    } catch (error) {
      console.error('Error uploading:', error);
      setValidationError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const resetModal = () => {
    setModalOpen(false);
    setSelectedFiles([]);
    setUrls(['']);
    setUploadResults(null);
    setValidationError('');
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      const response = await fetch(`${BASE_URL}/bb-rag/api/rag/delete/${documentToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        await refreshData();
        toast.success('Document deleted successfully');
        setDeleteDialogOpen(false);
        setDocumentToDelete(null);
      } else {
        toast.error(`Delete failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Delete failed. Please try again.');
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Don't render sidebar if RAG is disabled
  if (ragDisabled) {
    return null;
  }

  return (
    <>
    <aside className={`border-r bg-background flex flex-col h-full transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-80'}`}>
      {/* Header with Toggle Button */}
      <div className="p-4 border-b flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex-1">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Database className="w-4 h-4" />
              Knowledge Base
            </h2>
            {chatId ? (
              <p className="text-xs text-muted-foreground mt-1">
                {stats.documentCount} documents, {stats.chunkCount} chunks
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                No chat selected
              </p>
            )}
          </div>
        )}
        {isCollapsed && (
          <div className="flex items-center justify-center w-full">
            <Database className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0 flex-shrink-0"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Add Content - Icon Buttons */}
      {!isCollapsed ? (
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => {
                setModalMode('file');
                setModalOpen(true);
              }}
              title="Upload files"
            >
              <FileText className="w-4 h-4" />
            </Button>
            {/* Hidden for now - URL ingestion feature */}
            {/* <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => {
                setModalMode('url');
                setModalOpen(true);
              }}
              title="Add from URLs"
            >
              <LinkIcon className="w-4 h-4" />
            </Button> */}
          </div>
        </div>
      ) : (
        <div className="p-2 border-b flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0"
                title="Add Content"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="right">
              <DropdownMenuItem
                onClick={() => {
                  setModalMode('file');
                  setModalOpen(true);
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Upload Files</span>
              </DropdownMenuItem>
              {/* Hidden for now - URL ingestion feature */}
              {/* <DropdownMenuItem
                onClick={() => {
                  setModalMode('url');
                  setModalOpen(true);
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <LinkIcon className="w-4 h-4" />
                <span>Add from URL</span>
              </DropdownMenuItem> */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Document List */}
      {!isCollapsed ? (
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium mb-3">Documents</h3>

          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <File className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents yet</p>
              <p className="text-xs">Upload a document to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {doc.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(doc.createdAt)}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDocumentToDelete(doc);
                        setDeleteDialogOpen(true);
                      }}
                      className="flex-shrink-0 h-8 w-8 p-0"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 flex flex-col items-center gap-2">
          {documents.length > 0 ? (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="w-full flex justify-center"
                title={doc.title}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0"
                  onClick={() => setIsCollapsed(false)}
                >
                  <File className="w-5 h-5" />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <File className="w-8 h-8 mx-auto opacity-50" />
            </div>
          )}
        </div>
      )}
    </aside>

      {/* Upload Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) resetModal(); }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'file' ? 'Upload Files' : 'Add URLs'}
            </DialogTitle>
            <DialogDescription>
              {modalMode === 'file'
                ? 'Select one or more files to add to your knowledge base'
                : 'Enter one or more website URLs to extract and save content'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4">
            {modalMode === 'file' ? (
              <div className="space-y-3">
                <Input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".txt,.md,.pdf,.doc,.docx"
                  multiple
                  className="cursor-pointer"
                />

                {selectedFiles.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <p className="text-sm font-medium">{selectedFiles.length} file(s) selected:</p>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-sm p-2 bg-accent/50 rounded">
                        <span className="truncate flex-1">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-2"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {urls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => updateUrl(index, e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1"
                    />
                    {urls.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => removeUrl(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addUrlField}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another URL
                </Button>
              </div>
            )}

            {/* Validation Error */}
            {validationError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{validationError}</p>
              </div>
            )}

            {/* Upload Results */}
            {uploadResults && (
              <div className="space-y-3 pt-2">
                {uploadResults.success.length > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      ✓ Successfully added ({uploadResults.success.length})
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {uploadResults.success.map((item, index) => (
                        <p key={index} className="text-xs text-green-700 dark:text-green-300 truncate">
                          {item.name}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {uploadResults.failed.length > 0 && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm font-medium text-destructive mb-2">
                      ✗ Failed ({uploadResults.failed.length})
                    </p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {uploadResults.failed.map((item, index) => (
                        <div key={index} className="text-xs">
                          <p className="font-medium text-destructive truncate">{item.name}</p>
                          <p className="text-destructive/80 mt-0.5">{item.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetModal}
                disabled={uploading}
              >
                {uploadResults ? 'Close' : 'Cancel'}
              </Button>
              {!uploadResults && (
                <Button
                  type="submit"
                  disabled={uploading || (modalMode === 'file' && selectedFiles.length === 0) || (modalMode === 'url' && urls.filter(u => u.trim()).length === 0)}
                >
                  {uploading ? 'Processing...' : `Add ${modalMode === 'file' ? 'Files' : 'URLs'}`}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.title}"? This action cannot be undone
              and will permanently remove the document from your knowledge base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setDocumentToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
