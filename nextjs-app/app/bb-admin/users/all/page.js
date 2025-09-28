
"use client";

import profileService from "../../../../services/profileService";
import userService from "../../../../services/userService";
import Swal from 'sweetalert2';
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Search, Pencil, Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { redirect } from "next/navigation";

// User service for API calls

export default function AllUsersPage() {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newRole, setNewRole] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [activeRoleFilter, setActiveRoleFilter] = useState("all");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [5, 10, 20, 50];
  const [paginatedUsers, setPaginatedUsers] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  const proServ = new profileService();
  const userServ = new userService();

  // Function to delete a user and update the UI
  const deleteUsers = async (id) => {
    try {
      // Call the API to delete the user
      const data = await userServ.delete({id: id});
      
      // Update local state to remove the deleted user
      setUsers(prev => prev.filter(user => user.id !== id));
      setFilteredUsers(prev => prev.filter(user => user.id !== id));
      setPaginatedUsers(prev => prev.filter(user => user.id !== id));
      
      // If the user was in selected users, remove it
      if (selectedUsers.includes(id)) {
        setSelectedUsers(prev => prev.filter(userId => userId !== id));
      }
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `User with ID ${id} deleted successfully`
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error deleting user. Please try again.'
      });
    }
  }

  const fetchUsers = useCallback(async (page, size) => {
    try {
      const data = await proServ.all({page: page, size: size});
      
      if (data && data.res) {
        // Set users from API response
        const userList = data.res;
        setUsers(userList);
        
        // Apply filters to the fetched data
        let filtered = [...userList]; // Create a copy to avoid modifying the original
        
        // Apply role filter (case insensitive)
        if (activeRoleFilter !== "all") {
          filtered = filtered.filter(user => 
            (user.role || "").toLowerCase() === activeRoleFilter.toLowerCase()
          );
        }
        
        // Apply search filter
        if (searchQuery.trim() !== "") {
          const lowercaseQuery = searchQuery.toLowerCase();
          filtered = filtered.filter(user => 
            (user.userName || "").toLowerCase().includes(lowercaseQuery) ||
            (user.fullname && user.fullName.toLowerCase().includes(lowercaseQuery)) ||
            (user.email || "").toLowerCase().includes(lowercaseQuery) ||
            (user.role || "").toLowerCase().includes(lowercaseQuery)
          );
        }
        
        setFilteredUsers(filtered);
        
        // Set paginated users directly from filtered results
        setPaginatedUsers(filtered);
        
        // Calculate total pages based on filtered results
        const total = Math.ceil(filtered.length / size);
        setTotalPages(total || 1);
        
        // If current page is greater than total pages, set to last page
        if (page > total && total > 0) {
          setCurrentPage(total);
        }
      }
      else{
        redirect('/bb-auth/login');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error fetching users. Please try again.'
      });
      setPaginatedUsers([]);
      setTotalPages(1);
    }
  }, [proServ, activeRoleFilter, searchQuery]);

  // Initial data load
  useEffect(() => {
    fetchUsers(currentPage, pageSize);
  }, [fetchUsers, currentPage, pageSize]);

  // Handle filter changes (search query and role filter)
  useEffect(() => {
    if (users.length > 0) {
      // Reset to first page when filters change
      setCurrentPage(1);
      
      // Call fetchUsers with current page and page size
      // The fetchUsers function will apply the filters
      fetchUsers(1, pageSize);
    }
  }, [searchQuery, activeRoleFilter, pageSize, users.length, fetchUsers]);
  
  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchUsers(newPage, pageSize);
  };
  
  // Handle page size change
  const handlePageSizeChange = (newSize) => {
    setPageSize(Number(newSize));
    setCurrentPage(1); // Reset to first page
    fetchUsers(1, Number(newSize));
  };

  // Handle user selection (checkbox)
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Handle select all users
  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  // Handle changing roles for selected users
  const handleChangeRole = async () => {
    if (!newRole || selectedUsers.length === 0) return;
    
    try {
      // Call API to update roles with the correct parameter structure
      const data = await userServ.updateRoleAll({
        users: selectedUsers, 
        role: newRole
      });
      
      if (data && !data.error) {
        // Update all three user state variables to ensure UI reflects changes
        const updateUserRole = prev => prev.map(user => 
          selectedUsers.includes(user.id) ? { ...user, role: newRole } : user
        );
        
        // Update all three states to ensure the UI reflects changes
        setUsers(updateUserRole);
        setFilteredUsers(updateUserRole);
        setPaginatedUsers(updateUserRole);
        
        // Show success message
        Swal.fire({
          icon: 'success',
          title: 'Roles Updated',
          text: `Updated ${selectedUsers.length} user(s) to role: ${newRole}`
        });
        
        // Refresh the user list to ensure everything is in sync
        fetchUsers(currentPage, pageSize);
        
        // Reset after changing roles
        setNewRole("");
        setSelectedUsers([]);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: data.error || 'Failed to update user roles. Please try again.'
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update user roles. Please try again.'
      });
    }
  };


  // Delete selected users
  const handleDeleteSelected = () => {
    if (selectedUsers.length === 0) return;
    
    try {
      // Confirm deletion
      Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete ${selectedUsers.length} selected user(s). This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete them!'
      }).then((result) => {
        if (result.isConfirmed) {
          // Remove users from state
          setUsers(prev => prev.filter(user => !selectedUsers.includes(user.id)));
          
          // Show success message
          Swal.fire(
            'Deleted!',
            `${selectedUsers.length} user(s) have been deleted.`,
            'success'
          );
          
          // Clear selection
          setSelectedUsers([]);
        }
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete users. Please try again.'
      });
    }
  };

  return (
    <div className="p-6 w-full max-w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Users</h1>
          <Button asChild className="text-white" style={{ backgroundColor: "var(--chart-2)" }}>
            <Link href="/bb-admin/users/add-new">Add New</Link>
          </Button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <div className="flex items-center text-sm">
            <button 
              onClick={() => setActiveRoleFilter("all")} 
              className={activeRoleFilter === "all" ? "font-medium" : "text-muted-foreground hover:text-foreground"}
            >
              All
            </button>
            <span className="mx-1">({users.length})</span>
          </div>
          <span className="mx-1 text-muted-foreground">|</span>
          <div className="flex items-center gap-2 text-sm">
            <button 
              onClick={() => setActiveRoleFilter("administrator")} 
              className={activeRoleFilter === "administrator" ? "font-medium" : "text-muted-foreground hover:text-foreground"}
            >
              Administrator
            </button>
            <span className="text-muted-foreground">({users.filter(u => (u.role || "").toLowerCase() === "administrator").length})</span>
          </div>
          <span className="mx-1 text-muted-foreground">|</span>
          <div className="flex items-center gap-2 text-sm">
            <button 
              onClick={() => setActiveRoleFilter("subscriber")} 
              className={activeRoleFilter === "subscriber" ? "font-medium" : "text-muted-foreground hover:text-foreground"}
            >
              Subscriber
            </button>
            <span className="text-muted-foreground">({users.filter(u => (u.role || "").toLowerCase() === "subscriber").length})</span>
          </div>
        </div>
      </div>
      
      {/* User Management Tools */}
      <div className="mb-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          {/* Change Role Dropdown */}
          <div className="flex items-center gap-2">
            {selectedUsers.length > 0 && (
              <>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Change role to..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrator">Administrator</SelectItem>
                    <SelectItem value="subscriber">Subscriber</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleChangeRole}
                  disabled={!newRole || selectedUsers.length === 0}
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  Change
                </Button>
              </>
            )}
          </div>
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users"
              className="pl-10 w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button 
              type="submit" 
              className="absolute top-1/2 right-1 -translate-y-1/2 h-7 rounded-md"
              variant="ghost"
            >
              Search Users
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {selectedUsers.length > 0 
            ? `${selectedUsers.length} item${selectedUsers.length > 1 ? 's' : ''} selected` 
            : `${filteredUsers.length} items`}
        </div>
      </div>
      
      {/* Users Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]">
                <Checkbox 
                  checked={selectedUsers.length > 0 && selectedUsers.length === paginatedUsers.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium group relative cursor-pointer">
                      <div className="flex items-center">
                        <div className="mr-2 h-8 w-8 overflow-hidden rounded-full bg-muted">
                          {user.avatar ? (
                            <Image 
                              src={user.avatar}
                              alt={user.userName}
                              width={32}
                              height={32}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                              {user.userName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        {user.userName}
                      </div>
                      
                      {/* Hover Menu */}
                      <div className="absolute left-0 top-0 mt-6 hidden group-hover:flex items-center gap-1 bg-background z-10 p-1 shadow-md rounded-md border">
                        <Link href={`/bb-admin/users/profile/edit/${user.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          title="Delete"
                          onClick={() => deleteUsers(user.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.fullName || "—"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination Controls */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Only show page size selector, removed duplicate role change UI */}
          <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select 
                value={pageSize.toString()} 
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map(size => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Showing {paginatedUsers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} items
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            
            {/* Page Numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show page numbers around current page
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="mx-1">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(totalPages)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
