"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import Swal from 'sweetalert2';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import profileService from "../../../../../../services/profileService";
import userService from "../../../../../../services/userService";

export default function EditUserPage() {
  // Get the id from the URL params
  const params = useParams();
  const proServ = new profileService();
  const userServ = new userService();
  const urlId = params.id;
  
  // User data state
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  
  // Password management state
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [passwordStrengthColor, setPasswordStrengthColor] = useState("");
  
  // Function to fetch user data by ID
  const fetchUserData = useCallback(async (id) => {
    try {

      setIsLoading(true);
      
      // Make API call to get user data
      const response = await proServ.profile({ id: id });
  
      if (response && response.user) {
        const userData = response.user;
        
        // Update user state with fetched data
        setUser(userData);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'User Not Found',
          text: `No user data found for ID: ${id}`
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error fetching user data. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [proServ]);
  
  // Log the ID from URL and fetch user data when the page loads
  useEffect(() => {
    
    if (urlId) {
      fetchUserData(urlId);
    }
  }, [urlId, fetchUserData]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUser(prev => ({
      ...prev,
      [name]: value
    }));
  };
  

  
  // Password strength calculation
  const calculatePasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength("");
      setPasswordStrengthColor("");
      return;
    }

    // Simple password strength algorithm
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
    const isLongEnough = password.length >= 8;

    const strength = [hasLowercase, hasUppercase, hasNumber, hasSpecialChar, isLongEnough]
      .filter(Boolean).length;

    if (strength <= 2) {
      setPasswordStrength("Weak");
      setPasswordStrengthColor("bg-red-200 text-red-700");
    } else if (strength <= 4) {
      setPasswordStrength("Medium");
      setPasswordStrengthColor("bg-yellow-200 text-yellow-700");
    } else {
      setPasswordStrength("Strong");
      setPasswordStrengthColor("bg-green-200 text-green-700");
    }
  };

  // Generate random password
  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+";
    let newPassword = "";
    for (let i = 0; i < 12; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      newPassword += chars[randomIndex];
    }
    
    setPassword(newPassword);
    calculatePasswordStrength(newPassword);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Prepare updated user data
      const updatedUserData = {
        ...user
      };
      
      // Add password if it was changed
      if (password) {
        updatedUserData.password = password;
      }

      updatedUserData.id = urlId;
      
      // Call API to update user
      const response = await userServ.update(updatedUserData);
      
      if (response && !response.error) {
        
        // Clear password field after successful update
        setPassword("");
        setPasswordStrength("");
        setPasswordStrengthColor("");
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: response.error || 'Error updating user. Please try again.'
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while updating this user.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <div className="p-6 w-full max-w-full">
      <div className="mb-6">
        <div className="flex items-center mb-2 space-x-2">
          <Link href="/bb-admin/users/all" className="hover:underline flex items-center text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Users
          </Link>
        </div>
        <h1 className="text-2xl font-semibold">Edit User</h1>
        <p className="text-muted-foreground">Manage user information and account settings for user ID: {urlId}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mb-4"></div>
            <p>Loading user data...</p>
          </div>
        </div>
      ) : !user ? (
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <h2 className="text-xl font-medium text-red-800 dark:text-red-200 mb-2">User Not Found</h2>
          <p className="text-red-600 dark:text-red-300">No user data found for ID: {urlId}</p>
          <Link href="/bb-admin/users/all">
            <Button className="mt-4" variant="outline">
              Return to Users List
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-8">


            {/* Name Section */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-medium mb-4">Name</h2>
                
                <div className="space-y-4">
                 {/* Username */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <label htmlFor="username" className="text-sm font-medium">
                      Username
                    </label>
                    <div className="md:col-span-2">
                      <Input
                        id="username"
                        name="username"
                        value={user.userName}
                        readOnly
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Usernames cannot be changed.
                    </p>
                  </div>
                  
                  {/* First Name */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <label htmlFor="firstName" className="text-sm font-medium">
                      First Name
                    </label>
                    <div className="md:col-span-2">
                      <Input
                        id="firstName"
                        name="firstName"
                        value={user.firstName}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  {/* Last Name */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <label htmlFor="lastName" className="text-sm font-medium">
                      Last Name
                    </label>
                    <div className="md:col-span-2">
                      <Input
                        id="lastName"
                        name="lastName"
                        value={user.lastName}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
  
               
                </div>
              </CardContent>
            </Card>

            {/* Contact Info Section */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-medium mb-4">Contact Info</h2>
                
                <div className="space-y-4">
                  {/* Email */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <label htmlFor="email" className="text-sm font-medium pt-2">
                      Email (required)
                    </label>
                    <div className="md:col-span-2 space-y-2">
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={user.email}
                        onChange={handleInputChange}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        When changed, an email will be sent to the user at their new address to confirm it.
                      </p>
                    </div>
                  </div>
                  
                 
                </div>
              </CardContent>
            </Card>



            {/* Account Management Section */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-medium mb-4">Account Management</h2>
                
                <div className="space-y-6">
                  {/* Password */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <label className="text-sm font-medium pt-2">
                      Password
                    </label>
                    <div className="md:col-span-3 space-y-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={generateRandomPassword}
                        className="mb-2"
                      >
                        Generate Password
                      </Button>
                      
                      <div className="relative">
                        <Input 
                          type={passwordVisible ? "text" : "password"}
                          placeholder="Enter a new password" 
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            calculatePasswordStrength(e.target.value);
                          }}
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setPasswordVisible(!passwordVisible)}
                        >
                          {passwordVisible ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      
                      {passwordStrength && (
                        <div className={`text-center py-1 px-4 text-sm rounded ${passwordStrengthColor}`}>
                          {passwordStrength}
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        If you set a new password, a notification will be sent to the user.
                      </p>
                    </div>
                  </div>
                  
                  {/* Role */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <label className="text-sm font-medium">
                      Role
                    </label>
                    <div className="md:col-span-2">
                      <Select
                        value={user.role}
                        onValueChange={(value) => setUser(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Administrator">Administrator</SelectItem>
                          <SelectItem value="Subscriber">Subscriber</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4">
              <Link href="/bb-admin/users/all">
                <Button 
                  type="button" 
                  variant="outline"
                >
                  Cancel
                </Button>
              </Link>
              <Button 
                type="submit" 
                className="text-white" style={{ backgroundColor: "var(--chart-2)" }}
                disabled={isLoading}
              >
                {isLoading ? "Saving Changes..." : "Update User"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
