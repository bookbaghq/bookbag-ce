"use client";

import { useState, useEffect, useMemo } from "react";
import Swal from 'sweetalert2';
import Link from "next/link";
import profileService from "../../services/profileService";
import userService from "../../services/userService";
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
  Calendar,
  Boxes,
  Download,
  CheckCircle2,
  XCircle
} from "lucide-react";
import api from '@/apiConfig.json'

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    administrators: 0,
    subscribers: 0,
    otherRoles: 0,
    userGrowth: 0, // Placeholder for growth percentage
    recentUsers: [],
    modelTotals: { total: 0, downloaded: 0, published: 0, unpublished: 0 }
  });

  const proServ = useMemo(() => new profileService(), []);
  const userServ = useMemo(() => new userService(), []);

  // Fetch user statistics
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await proServ.all({});
        // Removed local models fetch (legacy local-LLM)
        const modelTotals = { total: 0, downloaded: 0, published: 0, unpublished: 0 };
        
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
          
          // Placeholder growth percentage
          const userGrowth = users.length > 0 ? 5.2 : 0;
          
          setStats({
            totalUsers: users.length,
            administrators,
            subscribers,
            otherRoles,
            userGrowth,
            recentUsers,
            modelTotals
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
    <div className="px-6 py-8 md:px-8 md:py-10 w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
           Welcome to your admin dashboard. Here&apos;s an overview of your site.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Loading user statistics...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* User Statistics Overview */}
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pt-6 pb-2 px-6">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="py-4 px-6">
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Activity className="mr-1 h-3 w-3 text-green-500" />
                  <span className="text-green-500 font-medium">{stats.userGrowth}%</span>
                  <span className="ml-1">growth</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-6 px-6">
                <Link href="/bb-admin/users/all" className="text-xs text-blue-500 flex items-center">
                  View all users
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </CardFooter>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pt-6 pb-2 px-6">
                <CardTitle className="text-sm font-medium">Administrators</CardTitle>
                <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  <Shield className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="py-4 px-6">
                <div className="text-2xl font-bold">{stats.administrators}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalUsers > 0 
                    ? `${Math.round((stats.administrators / stats.totalUsers) * 100)}% of total users` 
                    : 'No users'}
                </p>
              </CardContent>
              <CardFooter className="pt-0 pb-6 px-6">
                <Link href="/bb-admin/users/all" className="text-xs text-blue-500 flex items-center">
                  View administrators
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </CardFooter>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pt-6 pb-2 px-6">
                <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
                <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="py-4 px-6">
                <div className="text-2xl font-bold">{stats.subscribers}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalUsers > 0 
                    ? `${Math.round((stats.subscribers / stats.totalUsers) * 100)}% of total users` 
                    : 'No users'}
                </p>
              </CardContent>
              <CardFooter className="pt-0 pb-6 px-6">
                <Link href="/bb-admin/users/all" className="text-xs text-blue-500 flex items-center">
                  View subscribers
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </CardFooter>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pt-6 pb-2 px-6">
                <CardTitle className="text-sm font-medium">Other Roles</CardTitle>
                <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  <UserCog className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="py-4 px-6">
                <div className="text-2xl font-bold">{stats.otherRoles}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalUsers > 0 
                    ? `${Math.round((stats.otherRoles / stats.totalUsers) * 100)}% of total users` 
                    : 'No users'}
                </p>
              </CardContent>
              <CardFooter className="pt-0 pb-6 px-6">
                <Link href="/bb-admin/users/all" className="text-xs text-blue-500 flex items-center">
                  View all users
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </CardFooter>
            </Card>
          </div>
          {/* Models Statistics Overview */}
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pt-6 pb-2 px-6">
                <CardTitle className="text-sm font-medium">Total Models</CardTitle>
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Boxes className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="py-4 px-6">
                <div className="text-2xl font-bold">{stats.modelTotals.total}</div>
              </CardContent>
              <CardFooter className="pt-0 pb-6 px-6">
                <Link href="/bb-admin/models/my-models" className="text-xs text-blue-500 flex items-center">
                  View models
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </CardFooter>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pt-6 pb-2 px-6">
                <CardTitle className="text-sm font-medium">Downloaded</CardTitle>
                <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  <Download className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="py-4 px-6">
                <div className="text-2xl font-bold">{stats.modelTotals.downloaded}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.modelTotals.total > 0 
                    ? `${Math.round((stats.modelTotals.downloaded / stats.modelTotals.total) * 100)}% of models`
                    : 'No models'}
                </p>
              </CardContent>
              <CardFooter className="pt-0 pb-6 px-6">
                <Link href="/bb-admin/models/my-models" className="text-xs text-blue-500 flex items-center">
                  Manage
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </CardFooter>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pt-6 pb-2 px-6">
                <CardTitle className="text-sm font-medium">Published</CardTitle>
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="py-4 px-6">
                <div className="text-2xl font-bold">{stats.modelTotals.published}</div>
              </CardContent>
              <CardFooter className="pt-0 pb-6 px-6">
                <Link href="/bb-admin/models/my-models" className="text-xs text-blue-500 flex items-center">
                  View published
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </CardFooter>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pt-6 pb-2 px-6">
                <CardTitle className="text-sm font-medium">Unpublished</CardTitle>
                <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  <XCircle className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="py-4 px-6">
                <div className="text-2xl font-bold">{stats.modelTotals.unpublished}</div>
              </CardContent>
              <CardFooter className="pt-0 pb-6 px-6">
                <Link href="/bb-admin/models/my-models" className="text-xs text-blue-500 flex items-center">
                  View unpublished
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
