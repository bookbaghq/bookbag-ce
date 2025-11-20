'use client';

/**
 * WordPress-Style Plugin Upload Page
 * Upload, validate, and install plugins from ZIP files
 */

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import api from '@/apiConfig.json';

export default function NewPluginPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [maxFileSize, setMaxFileSize] = useState(104857600); // Default 100MB
  const [loadingSettings, setLoadingSettings] = useState(true);
  const fileInputRef = useRef(null);

  // Fetch max file size from settings
  useEffect(() => {
    const fetchMaxFileSize = async () => {
      try {
        const backendUrl = api.ApiConfig.main;
        const response = await fetch(`${backendUrl}/api/admin/settings`, {
          credentials: 'include'
        });
        const data = await response.json();

        if (data.success && data.settings.plugin_upload_max_file_size) {
          setMaxFileSize(data.settings.plugin_upload_max_file_size);
        }
      } catch (err) {
        console.error('Error fetching max file size:', err);
        // Keep default value
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchMaxFileSize();
  }, []);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        setSelectedFile(file);
        setError(null);
        setResult(null);
      } else {
        setError('Please select a ZIP file');
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.name.endsWith('.zip')) {
        setSelectedFile(file);
        setError(null);
        setResult(null);
      } else {
        setError('Please select a ZIP file');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('pluginFile', selectedFile);

      const backendUrl = api.ApiConfig.main;

      // Simulate progress (since we can't track real upload progress easily)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`${backendUrl}/api/plugins/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (data.success) {
        setResult({
          type: 'success',
          message: data.message,
          plugin: data.plugin
        });
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError(data.error || 'Failed to upload plugin');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload plugin. Please try again.');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setError(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold">Add New Plugin</h1>
          <Link href="/bb-admin/plugins/installed">
            <Button variant="outline" size="sm">
              Back to Installed Plugins
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload a plugin in .zip format. The plugin will be unpacked in the bb-plugins directory.
        </p>
      </div>

      {/* Upload Area */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Upload Plugin</h2>

        {/* Drag and Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-300 dark:border-gray-700'
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-2">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={uploading}
              >
                Choose Different File
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-2">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium mb-1">
                  Drop plugin file here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  {loadingSettings ? (
                    'Loading limit...'
                  ) : (
                    `Maximum file size: ${(maxFileSize / 1048576).toFixed(0)} MB`
                  )}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" asChild>
                  <span className="cursor-pointer">Select File</span>
                </Button>
              </label>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Uploading...</span>
              <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Button */}
        {selectedFile && !uploading && (
          <div className="mt-4">
            <Button onClick={handleUpload} className="w-full" size="lg">
              Install Plugin
            </Button>
          </div>
        )}

        {/* Success Message */}
        {result && result.type === 'success' && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">
                  Plugin Installed Successfully!
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                  {result.message}
                </p>
                {result.plugin && (
                  <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded border border-green-200 dark:border-green-800">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Name:</span> {result.plugin.name}
                      </div>
                      <div>
                        <span className="font-medium">Version:</span> {result.plugin.version}
                      </div>
                      {result.plugin.author && (
                        <div className="col-span-2">
                          <span className="font-medium">Author:</span> {result.plugin.author}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-3">
                  <Link href="/bb-admin/plugins/installed">
                    <Button size="sm" variant="default">
                      Go to Installed Plugins
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                  Upload Failed
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Requirements Card */}
      <Card className="p-6 bg-muted/50">
        <h2 className="text-lg font-semibold mb-3">Plugin Requirements</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mt-2 mr-3 flex-shrink-0"></span>
            <p>
              The plugin must be packaged as a <span className="font-medium text-foreground">.zip file</span>
            </p>
          </div>
          <div className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mt-2 mr-3 flex-shrink-0"></span>
            <p>
              The ZIP must contain a root directory with the plugin slug name (e.g., <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">my-plugin.zip</span> contains <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">my-plugin/</span>)
            </p>
          </div>
          <div className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mt-2 mr-3 flex-shrink-0"></span>
            <p>
              A valid <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">plugin.json</span> file must be present in the root directory
            </p>
          </div>
          <div className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mt-2 mr-3 flex-shrink-0"></span>
            <p>
              The <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">plugin.json</span> must include: <span className="font-medium text-foreground">name</span>, <span className="font-medium text-foreground">slug</span>, <span className="font-medium text-foreground">version</span>, <span className="font-medium text-foreground">entry</span>
            </p>
          </div>
          <div className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mt-2 mr-3 flex-shrink-0"></span>
            <p>
              The <span className="font-medium text-foreground">entry</span> field should point to your main plugin file (e.g., <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">&quot;entry&quot;: &quot;index.js&quot;</span>)
            </p>
          </div>
          <div className="flex items-start">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mt-2 mr-3 flex-shrink-0"></span>
            <p>
              The directory name must match the <span className="font-medium text-foreground">slug</span> field in plugin.json
            </p>
          </div>
        </div>
      </Card>

      {/* Example Structure Card */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3">Example Plugin Structure</h2>
        <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <div className="text-muted-foreground">my-plugin.zip</div>
          <div className="ml-4 mt-1">
            <div className="text-blue-600 dark:text-blue-400">└── my-plugin/</div>
            <div className="ml-8">
              <div className="text-muted-foreground">├── plugin.json</div>
              <div className="text-muted-foreground">├── index.js</div>
              <div className="text-muted-foreground">├── package.json</div>
              <div className="text-blue-600 dark:text-blue-400">├── app/</div>
              <div className="text-blue-600 dark:text-blue-400">├── config/</div>
              <div className="text-blue-600 dark:text-blue-400">└── nextjs/</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
