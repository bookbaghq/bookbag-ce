'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  File,
  FileText,
  Loader2,
  Database,
  MessageSquare,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';
import api from '@/apiConfig.json';

const BASE_URL = api.ApiConfig.main;

export default function RAGDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const url = new URL(`${BASE_URL}/bb-rag/api/rag/admin/list`);
      if (searchTerm) {
        url.searchParams.append('search', searchTerm);
      }

      const response = await fetch(url, {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents || []);
      } else {
        toast.error(data.error || 'Failed to load documents');
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `${BASE_URL}/bb-rag/api/rag/delete/${selectedDocument.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Document deleted successfully');
        setDocuments(documents.filter((doc) => doc.id !== selectedDocument.id));
        setDeleteDialogOpen(false);
        setSelectedDocument(null);
      } else {
        toast.error(data.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(parseInt(timestamp)).toLocaleString();
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <FileText className="h-4 w-4" />;
    if (mimeType.startsWith('text/')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">RAG Documents</h1>
          <p className="text-muted-foreground mt-1">
            Manage all documents in the knowledge base
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Database className="h-4 w-4" />
            <span className="text-sm">Total Documents</span>
          </div>
          <p className="text-2xl font-bold">{documents.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <FileText className="h-4 w-4" />
            <span className="text-sm">Total Chunks</span>
          </div>
          <p className="text-2xl font-bold">
            {documents.reduce((sum, doc) => sum + (doc.chunkCount || 0), 0)}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <FileText className="h-4 w-4" />
            <span className="text-sm">Total Size</span>
          </div>
          <p className="text-2xl font-bold">
            {formatFileSize(documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0))}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search documents by name or filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-4 font-medium">Document</th>
              <th className="text-left p-4 font-medium">Source</th>
              <th className="text-left p-4 font-medium">Chunks</th>
              <th className="text-left p-4 font-medium">Size</th>
              <th className="text-left p-4 font-medium">Created</th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading documents...</p>
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center p-8">
                  <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No documents found' : 'No documents yet'}
                  </p>
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {getFileIcon(doc.mimeType)}
                      <div>
                        <p className="font-medium">{doc.title || doc.filename}</p>
                        <p className="text-sm text-muted-foreground">{doc.filename}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {doc.chatTitle ? (
                      <div className="flex items-center gap-2 text-sm">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span>{doc.chatTitle}</span>
                      </div>
                    ) : doc.workspaceName ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>{doc.workspaceName}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Unknown</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-sm">{doc.chunkCount || 0}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm">{formatFileSize(doc.fileSize)}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(doc.createdAt)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDocument(doc);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedDocument?.title || selectedDocument?.filename}&quot;?
              This will also delete all {selectedDocument?.chunkCount || 0} associated chunks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
