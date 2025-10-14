'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  File,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Download,
  HardDrive,
  Loader2
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

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || api.ApiConfig.main;

export default function MediaPage() {
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({
    totalFiles: 0,
    formattedSize: '0 Bytes',
    bySource: { admin: 0, client: 0, api: 0 }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalPages: 1
  });

  useEffect(() => {
    fetchFiles();
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm) {
        searchFiles();
      } else {
        fetchFiles();
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BASE_URL}/bb-media/api/media/list?page=${pagination.page}&limit=${pagination.limit}`,
        { credentials: 'include' }
      );
      const data = await response.json();

      if (data.success) {
        setFiles(data.files || []);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BASE_URL}/bb-media/api/media/search?q=${encodeURIComponent(searchTerm)}&page=${pagination.page}&limit=${pagination.limit}`,
        { credentials: 'include' }
      );
      const data = await response.json();

      if (data.success) {
        setFiles(data.files || []);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error('Error searching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${BASE_URL}/bb-media/api/media/stats`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success && data.stats) {
        setStats({
          totalFiles: data.stats.totalFiles || 0,
          formattedSize: data.stats.formattedSize || '0 Bytes',
          bySource: data.stats.bySource || { admin: 0, client: 0, api: 0 }
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Keep default stats on error
    }
  };


  const handleDeleteFile = async () => {
    if (!selectedFile) return;

    try {
      const response = await fetch(
        `${BASE_URL}/bb-media/api/media/delete/${selectedFile.id}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      const data = await response.json();

      if (data.success) {
        await fetchFiles();
        await fetchStats();
        setDeleteDialogOpen(false);
        setSelectedFile(null);
        toast.success('File deleted successfully');
      } else {
        toast.error(`Delete failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Delete failed. Please try again.');
    }
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <File className="w-8 h-8 text-gray-400" />;

    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="w-8 h-8 text-blue-500" />;
    } else if (mimeType.startsWith('video/')) {
      return <Video className="w-8 h-8 text-purple-500" />;
    } else if (mimeType.startsWith('audio/')) {
      return <Music className="w-8 h-8 text-green-500" />;
    } else if (mimeType.startsWith('text/') || mimeType.includes('document')) {
      return <FileText className="w-8 h-8 text-orange-500" />;
    } else {
      return <File className="w-8 h-8 text-gray-400" />;
    }
  };

  const formatDate = (timestamp) => {
    return new Date(parseInt(timestamp)).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Media Library</h1>
        <p className="text-muted-foreground">
          Manage all uploaded files in your system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <File className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">Total Files</h3>
          </div>
          <p className="text-2xl font-bold">{stats?.totalFiles || 0}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">Storage Used</h3>
          </div>
          <p className="text-2xl font-bold">{stats?.formattedSize || '0 Bytes'}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <File className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">Chat Files</h3>
          </div>
          <p className="text-2xl font-bold">{stats?.bySource?.chat || 0}</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <File className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">Workspace Files</h3>
          </div>
          <p className="text-2xl font-bold">{stats?.bySource?.workspace || 0}</p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Files Grid */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground">Loading files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12">
          <File className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg font-medium mb-2">No files found</p>
          <p className="text-muted-foreground">
            {searchTerm ? 'Try adjusting your search' : 'No media files available'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {files.map((file) => (
              <div
                key={file.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>{getFileIcon(file.mimeType)}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setSelectedFile(file);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <h3 className="font-medium text-sm mb-1 truncate" title={file.filename}>
                  {file.filename}
                </h3>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>{file.formattedSize}</p>
                  <p>{formatDate(file.createdAt)}</p>
                  <p className="capitalize">
                    <span className="inline-block px-2 py-0.5 rounded bg-accent text-accent-foreground">
                      {file.uploadSource}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedFile?.filename}&quot;? This action cannot be undone
              and will permanently remove the file from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedFile(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteFile}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
