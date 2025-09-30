"use client";

import { useState, useEffect, useMemo } from "react";
import Swal from 'sweetalert2';
import Link from "next/link";
import profileService from "../../../services/profileService";
import userService from "../../../services/userService";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { 
  ArrowUpRight, 
  Users, 
  UserPlus, 
  Shield, 
  Settings, 
  User,
  UserCog,
  Activity,
  Calendar
} from "lucide-react";

export default function UsersDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    administrators: 0,
    subscribers: 0,
    otherRoles: 0,
    userGrowth: 0, // Placeholder for growth percentage
    recentUsers: []
  });

  const proServ = useMemo(() => new profileService(), []);
  const userServ = useMemo(() => new userService(), []);

  // Fetch user statistics
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await proServ.all({});
        
        if (data && data.res) {
          const users = data.res;
          
          // Count users by role
          const administrators = users.filter(user => 
            (user.role || "").toLowerCase() === "administrator"
          ).length;
          
          const subscribers = users.filter(user => 
            (user.role || "").toLowerCase() === "subscriber"
          ).length;

          const otherRoles = users.length - administrators - subscribers;
          
          // Get most recent users (up to 5)
          const recentUsers = [...users]
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 5);
          
          // Calculate a placeholder growth percentage (would normally come from real data)
          // In a real app, you'd compare to previous period data
          const userGrowth = users.length > 0 ? 5.2 : 0; // Placeholder 5.2% growth
          
          setStats({
            totalUsers: users.length,
            administrators,
            subscribers,
            otherRoles,
            userGrowth,
            recentUsers
          });
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load user statistics. Please try again.'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [proServ]);

  return (
    <div className="p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">User Management Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor user statistics and manage user-related operations.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Loading user statistics...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* User Statistics Overview */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Activity className="mr-1 h-3 w-3 text-green-500" />
                  <span className="text-green-500 font-medium">{stats.userGrowth}%</span>
                  <span className="ml-1">growth</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Link href="/bb-admin/users/all" className="text-xs text-blue-500 flex items-center">
                  View all users
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Administrators</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.administrators}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalUsers > 0 
                    ? `${Math.round((stats.administrators / stats.totalUsers) * 100)}% of total users` 
                    : 'No users'}
                </p>
              </CardContent>
              <CardFooter className="pt-0">
                <Link href="/bb-admin/users/all" className="text-xs text-blue-500 flex items-center">
                  View administrators
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.subscribers}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalUsers > 0 
                    ? `${Math.round((stats.subscribers / stats.totalUsers) * 100)}% of total users` 
                    : 'No users'}
                </p>
              </CardContent>
              <CardFooter className="pt-0">
                <Link href="/bb-admin/users/all" className="text-xs text-blue-500 flex items-center">
                  View subscribers
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Other Roles</CardTitle>
                <UserCog className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.otherRoles}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalUsers > 0 
                    ? `${Math.round((stats.otherRoles / stats.totalUsers) * 100)}% of total users` 
                    : 'No users'}
                </p>
              </CardContent>
              <CardFooter className="pt-0">
                <Link href="/bb-admin/users/all" className="text-xs text-blue-500 flex items-center">
                  View all users
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </CardFooter>
            </Card>
          </div>

          {/* User Management Tools */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Manage Users</CardTitle>
                <CardDescription>
                  View, edit, and delete user accounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span>Manage {stats.totalUsers} registered users</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <span>Control user roles and permissions</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full text-white" style={{ backgroundColor: "var(--chart-2)" }}>
                  <Link href="/bb-admin/users/all">View All Users</Link>
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Add New User</CardTitle>
                <CardDescription>
                  Create a new user account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <UserPlus className="h-5 w-5 text-muted-foreground" />
                  <span>Add users with specified roles</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <span>Generate secure passwords</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full text-white" style={{ backgroundColor: "var(--chart-2)" }}>
                  <Link href="/bb-admin/users/add-new">Add New User</Link>
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>User Settings</CardTitle>
                <CardDescription>
                  Configure global user settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span>Manage registration options</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <span>Control authentication settings</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full text-white" style={{ backgroundColor: "var(--chart-2)" }}>
                  <Link href="/bb-admin/users/settings">Configure Settings</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* User Distribution Graph */}
          <Card>
            <CardHeader>
              <CardTitle>User Role Distribution</CardTitle>
              <CardDescription>Breakdown of users by their assigned roles</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-2">
                <div>
                  <div className="mb-1 text-sm font-medium">Administrators</div>
                  <div className="w-full bg-gray-200 rounded-full h-6 dark:bg-gray-700 relative">
                    <div 
                      className="bg-blue-600 h-6 rounded-full flex items-center justify-center text-xs text-white font-medium" 
                      style={{ 
                        width: `${stats.totalUsers > 0 ? Math.max((stats.administrators / stats.totalUsers) * 100, 15) : 15}%` 
                      }}
                    >
                      {stats.administrators} Admins
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="mb-1 text-sm font-medium">Subscribers</div>
                  <div className="w-full bg-gray-200 rounded-full h-6 dark:bg-gray-700 relative">
                    <div 
                      className="bg-green-500 h-6 rounded-full flex items-center justify-center text-xs text-white font-medium" 
                      style={{ 
                        width: `${stats.totalUsers > 0 ? Math.max((stats.subscribers / stats.totalUsers) * 100, 15) : 15}%` 
                      }}
                    >
                      {stats.subscribers} Subscribers
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="mb-1 text-sm font-medium">Other Roles</div>
                  <div className="w-full bg-gray-200 rounded-full h-6 dark:bg-gray-700 relative">
                    <div 
                      className="bg-gray-500 h-6 rounded-full flex items-center justify-center text-xs text-white font-medium" 
                      style={{ 
                        width: `${stats.totalUsers > 0 ? Math.max((stats.otherRoles / stats.totalUsers) * 100, 15) : 15}%` 
                      }}
                    >
                      {stats.otherRoles} Other
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Users */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>Latest user registrations on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No recent users found.</p>
                ) : (
                  stats.recentUsers.map((user, index) => (
                    <div key={user.id || index} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
                          {user.avatar ? (
                            <Image 
                              src={user.avatar}
                              alt={user.userName}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                              {user.userName ? user.userName.charAt(0).toUpperCase() : "U"}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{user.userName || "Unknown User"}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.email || "No email provided"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="mr-4 text-sm text-muted-foreground">
                          {user.role || "No role"}
                        </div>
                        <Link href={`/bb-admin/users/profile/edit/${user.id}`}>
                          <Button variant="ghost" size="sm">
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/bb-admin/users/all" className="text-sm text-blue-500 flex items-center">
                View all users
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Link>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
