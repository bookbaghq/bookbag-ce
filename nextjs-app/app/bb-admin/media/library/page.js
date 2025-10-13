"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Grid, 
  LayoutGrid, 
  List, 
  Search, 
  Upload, 
  PlusCircle, 
  MessageSquare,
  ChevronDown,
  ArrowUpDown,
  Pencil,
  Trash2,
  Eye
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// Mock media data with a variety of media types
const mockMediaItems = [
  // Images
  {
    id: 1,
    filename: "c02f7-pexels-lucasmenesesphoto-6144105.jpg",
    title: "Ocean Waves Abstract",
    author: "thegeekboys",
    uploadedTo: "Collaboration Magic",
    comments: 0,
    type: "image",
    date: "2025/05/13",
    thumbnail: "/avatars/you.jpg", // Using existing image from the project
    fileSize: "2.4 MB"
  },
  {
    id: 2,
    filename: "0b92d-pexels-andreea-ch-371539-3371410.jpg",
    title: "Mountain Sunrise",
    author: "thegeekboys",
    uploadedTo: "The Art of Connection",
    comments: 2,
    type: "image",
    date: "2025/05/13",
    thumbnail: "/avatars/you.jpg",
    fileSize: "1.8 MB"
  },
  {
    id: 3,
    filename: "8518f-pexels-urlapovaanna-2957061.jpg",
    title: "City Lights Night Scene",
    author: "thegeekboys",
    uploadedTo: "Beyond the Obstacle",
    comments: 0,
    type: "image",
    date: "2025/05/13",
    thumbnail: "/avatars/you.jpg",
    fileSize: "3.2 MB"
  },
  {
    id: 4,
    filename: "f6898-pexels-rozegold-6189184.jpg",
    title: "Abstract Bokeh Background",
    author: "thegeekboys",
    uploadedTo: "Growth Unlocked",
    comments: 1,
    type: "image",
    date: "2025/05/13",
    thumbnail: "/avatars/you.jpg",
    fileSize: "1.4 MB"
  },
  // Videos
  {
    id: 5,
    filename: "intro-animation-company-presentation.mp4",
    title: "Company Intro Animation",
    author: "mediaCreator",
    uploadedTo: "About Page",
    comments: 3,
    type: "video",
    date: "2025/04/21",
    fileSize: "24.5 MB",
    duration: "00:01:15"
  },
  {
    id: 6,
    filename: "product-demo-v2-final.mp4",
    title: "Product Demo Video",
    author: "productTeam",
    uploadedTo: "Product Launch",
    comments: 5,
    type: "video",
    date: "2025/04/10",
    fileSize: "48.7 MB",
    duration: "00:03:22"
  },
  // Audio
  {
    id: 7,
    filename: "podcast-interview-ep42.mp3",
    title: "Expert Interview - Episode 42",
    author: "contentManager",
    uploadedTo: "Podcast Page",
    comments: 0,
    type: "audio",
    date: "2025/05/01",
    fileSize: "18.3 MB",
    duration: "00:28:45"
  },
  {
    id: 8,
    filename: "background-music-loop.mp3",
    title: "Background Music Loop",
    author: "designTeam",
    uploadedTo: "Homepage",
    comments: 0,
    type: "audio",
    date: "2025/03/15",
    fileSize: "4.8 MB",
    duration: "00:03:30"
  },
  // Documents
  {
    id: 9,
    filename: "annual-report-2024-final.pdf",
    title: "2024 Annual Report",
    author: "financeTeam",
    uploadedTo: "Investor Relations",
    comments: 2,
    type: "document",
    date: "2025/02/28",
    fileSize: "8.5 MB",
    pages: 42
  },
  {
    id: 10,
    filename: "employee-handbook-v3.2.pdf",
    title: "Employee Handbook",
    author: "hrTeam",
    uploadedTo: "Internal Resources",
    comments: 0,
    type: "document",
    date: "2025/01/15",
    fileSize: "5.2 MB",
    pages: 28
  },
  // Spreadsheets
  {
    id: 11,
    filename: "q1-2025-metrics-analysis.xlsx",
    title: "Q1 2025 Metrics Analysis",
    author: "analyticsTeam",
    uploadedTo: "Team Dashboard",
    comments: 4,
    type: "spreadsheet",
    date: "2025/04/05",
    fileSize: "2.8 MB"
  },
  {
    id: 12,
    filename: "budget-forecast-2025-2026.xlsx",
    title: "Budget Forecast",
    author: "financeTeam",
    uploadedTo: "Finance Portal",
    comments: 7,
    type: "spreadsheet",
    date: "2025/03/22",
    fileSize: "3.4 MB"
  },
  // Archives
  {
    id: 13,
    filename: "project-assets-batch-12.zip",
    title: "Project Assets - Batch 12",
    author: "assetManager",
    uploadedTo: "Design Resources",
    comments: 0,
    type: "archive",
    date: "2025/05/10",
    fileSize: "156.2 MB"
  },
  {
    id: 14,
    filename: "backup-website-20250423.zip",
    title: "Website Backup - April 23",
    author: "systemAdmin",
    uploadedTo: "Unattached",
    comments: 0,
    type: "archive",
    date: "2025/04/23",
    fileSize: "234.8 MB"
  },
  // Unattached Items
  {
    id: 15,
    filename: "temp-image-for-review.jpg",
    title: "Temp Image for Review",
    author: "contentManager",
    uploadedTo: "Unattached",
    comments: 0,
    type: "image",
    date: "2025/05/12",
    thumbnail: "/avatars/you.jpg",
    fileSize: "1.9 MB"
  },
  {
    id: 16,
    filename: "draft-presentation-slides.pptx",
    title: "Draft Presentation Slides",
    author: "marketingTeam",
    uploadedTo: "Unattached",
    comments: 0,
    type: "document",
    date: "2025/05/11",
    fileSize: "12.6 MB",
    slides: 24
  }
];

export default function MediaLibraryPage() {
  const [mediaItems, setMediaItems] = useState(mockMediaItems);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedMediaType, setSelectedMediaType] = useState("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState(mockMediaItems);
  const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
  // Calculate total storage used from mock data
  const [totalStorage, setTotalStorage] = useState("1 GB");
  const [usedStorage, setUsedStorage] = useState("");
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    // Calculate total size from mock data
    const calculateTotalSize = () => {
      // This would normally come from a server-side calculation
      // For mock data, we'll parse the fileSize strings
      let totalBytes = 0;
      
      mockMediaItems.forEach(item => {
        if (item.fileSize) {
          const sizeStr = item.fileSize;
          let sizeNum = parseFloat(sizeStr.split(' ')[0]);
          let unit = sizeStr.split(' ')[1];
          
          // Convert to bytes
          switch(unit) {
            case 'KB':
              sizeNum *= 1024;
              break;
            case 'MB':
              sizeNum *= 1024 * 1024;
              break;
            case 'GB':
              sizeNum *= 1024 * 1024 * 1024;
              break;
            default:
              break;
          }
          
          totalBytes += sizeNum;
        }
      });
      
      // Format back to human readable
      let formattedSize;
      if (totalBytes < 1024) {
        formattedSize = `${totalBytes} B`;
      } else if (totalBytes < 1024 * 1024) {
        formattedSize = `${(totalBytes / 1024).toFixed(1)} KB`;
      } else if (totalBytes < 1024 * 1024 * 1024) {
        formattedSize = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
      } else {
        formattedSize = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      }
      
      setUsedStorage(formattedSize);
      
      // Calculate percentage
      // For demo purposes, assume 1 GB = 1024 MB total storage
      const totalBytes1GB = 1024 * 1024 * 1024;
      const percentage = (totalBytes / totalBytes1GB * 100).toFixed(1);
      setUploadPercentage(percentage);
    };
    
    calculateTotalSize();
  }, []);

  // Filter media items based on selections
  useEffect(() => {
    let filtered = [...mediaItems];
    
    // Filter by media type
    if (selectedMediaType !== "all") {
      filtered = filtered.filter(item => item.type === selectedMediaType);
    }
    
    // Filter by date
    if (selectedDateFilter !== "all") {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch(selectedDateFilter) {
        case "1month":
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case "3months":
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case "6months":
          cutoffDate.setMonth(now.getMonth() - 6);
          break;
        case "1year":
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(item => new Date(item.date.replace(/\//g, '-')) >= cutoffDate);
    }
    
    // Filter by search query
    if (searchQuery.trim() !== "") {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(lowerCaseQuery) ||
        item.filename.toLowerCase().includes(lowerCaseQuery) ||
        item.author.toLowerCase().includes(lowerCaseQuery)
      );
    }
    
    setFilteredItems(filtered);
  }, [selectedMediaType, selectedDateFilter, searchQuery, mediaItems]);

  // Toggle selection of a single item
  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  // Toggle selection of all items
  const toggleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  // Handle bulk action
  const handleBulkAction = (action) => {
    if (selectedItems.length === 0) return;

    if (action === "delete") {
      setDeleteDialogOpen(true);
    }
  };

  const confirmBulkDelete = () => {
    // Remove selected items from our media list
    setMediaItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
    setSelectedItems([]);
    setDeleteDialogOpen(false);
  };

  // Format file name for display
  const formatFileTitle = (name, maxLength = 20) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + "...";
  };

  // Format date from YYYY/MM/DD to MM/DD/YYYY
  const formatDateToAmerican = (dateString) => {
    if (!dateString) return "";
    const parts = dateString.split('/');
    if (parts.length !== 3) return dateString;
    
    // Rearrange from YYYY/MM/DD to MM/DD/YYYY
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  };

  return (
    <div className="p-6 w-full max-w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Media Library</h1>
        <div className="flex space-x-2">
          <Button className="bg-blue-600 hover:bg-blue-700 flex items-center">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Media
          </Button>
          <Button variant="outline" className="flex items-center">
            <Upload className="h-4 w-4 mr-2" />
            Import Media
          </Button>
        </div>
      </div>

      {/* Storage Info */}
      <div className="mb-6 text-sm">
        <p className="text-muted-foreground">
          You are currently using <span className="font-medium">{usedStorage}</span> out of <span className="font-medium">{totalStorage}</span> upload limit ({uploadPercentage}%).{" "}
          <Link href="#" className="text-blue-600 hover:underline">
            Upgrade
          </Link>{" "}
          your plan to increase your storage space and to allow audio and video uploads.
        </p>
      </div>

      {/* Filters and Controls */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        {/* View Mode Toggle */}
        <div className="flex border rounded-md overflow-hidden">
          <Button 
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>

        {/* Media Type Filter */}
        <Select value={selectedMediaType} onValueChange={setSelectedMediaType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All media items" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All media items</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
            <SelectItem value="archive">Archives</SelectItem>
            <SelectItem value="unattached">Unattached</SelectItem>
            <SelectItem value="mine">Mine</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Filter */}
        <Select value={selectedDateFilter} onValueChange={setSelectedDateFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="All dates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            <SelectItem value="1month">1 month</SelectItem>
            <SelectItem value="3months">3 months</SelectItem>
            <SelectItem value="6months">6 months</SelectItem>
            <SelectItem value="1year">1 year</SelectItem>
          </SelectContent>
        </Select>

        <Button size="sm">Filter</Button>

        {/* Search */}
        <div className="flex-grow flex justify-end">
          <div className="relative max-w-md w-full">
            <Input
              placeholder="Search Media"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-8"
            />
            <Button 
              size="sm" 
              variant="ghost" 
              className="absolute right-0 top-0 h-full"
              onClick={() => {/* Search action */}}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Select 
            disabled={selectedItems.length === 0}
            onValueChange={(value) => handleBulkAction(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Bulk actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="delete">Delete Permanently</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            variant="outline"
            disabled={selectedItems.length === 0}
            onClick={() => handleBulkAction("apply")}
          >
            Apply
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredItems.length} items
        </div>
      </div>

      {/* Media List */}
      {viewMode === "list" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedItems.length > 0 && selectedItems.length === filteredItems.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="min-w-[250px]">
                  <div className="flex items-center space-x-1">
                    <span>File</span>
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center space-x-1">
                    <span>Author</span>
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center space-x-1">
                    <span>Uploaded to</span>
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No media files found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map(item => (
                  <TableRow key={item.id} className="group hover:bg-muted/50">
                    <TableCell>
                      <Checkbox 
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => toggleItemSelection(item.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-muted rounded-sm overflow-hidden relative flex-shrink-0">
                          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            {item.type === "image" ? (
                              <Image
                                src={item.thumbnail || "/avatars/you.jpg"}
                                alt={item.title}
                                fill
                                sizes="48px"
                                style={{ objectFit: 'cover' }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-muted">
                                {item.type.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="relative font-medium group hover:text-blue-600 cursor-pointer">
                            <span>{item.title}</span>
                            <div className="absolute left-0 top-full mt-1 hidden group-hover:flex items-center gap-1 bg-background z-10 p-1 shadow-md rounded-md border">
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="View">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatFileTitle(item.filename)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-blue-600 hover:underline cursor-pointer">
                        {item.author}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-blue-600 hover:underline cursor-pointer">
                          {item.uploadedTo}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Detach
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDateToAmerican(item.date)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        // Grid View
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredItems.map(item => (
            <Card key={item.id} className="overflow-hidden group">
              <div className="relative aspect-square bg-muted">
                {item.type === "image" ? (
                  <Image
                    src={item.thumbnail || "/avatars/you.jpg"}
                    alt={item.title}
                    fill
                    sizes="160px"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    {item.type.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Checkbox 
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => toggleItemSelection(item.id)}
                    className="bg-white/90"
                  />
                </div>
              </div>
              <CardContent className="p-3">
                <div className="text-sm font-medium truncate">{item.title}</div>
                <div className="text-xs text-muted-foreground truncate">{formatFileTitle(item.filename)}</div>
                <div className="mt-2 flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="View">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bottom Bulk Actions */}
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {filteredItems.length} items
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedItems.length} selected item{selectedItems.length !== 1 ? 's' : ''}?
              This action cannot be undone and will permanently remove the file{selectedItems.length !== 1 ? 's' : ''} from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmBulkDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
