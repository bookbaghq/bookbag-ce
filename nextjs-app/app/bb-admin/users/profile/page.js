"use client";

import profileService from "../../../../services/profileService";
import userService from "../../../../services/userService";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Swal from 'sweetalert2';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import MailService from "@/services/mailService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, EyeOff } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export default function ProfilePage() {
  const proServ = useMemo(() => new profileService(), []);
  const userServ = useMemo(() => new userService(), []);
  // State setup
  const [user, setUser] = useState({
    userName: "",
    firstName: "",
    lastName: "",
    email: "",
    profilePicture: "",
    id: "",
    role: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  
  // Password management state
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [passwordStrengthColor, setPasswordStrengthColor] = useState("");
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState("");
  const [formErrors, setFormErrors] = useState({ email: "", password: "", firstName: "", lastName: "" });

  // Function to fetch current user profile data
  const fetchUserData = useCallback(async () => {
    try {
      const response = await proServ.myProfile();
      
      if (response && response.user) {
        const userData = response.user;
        
        // Update user state with fetched data (normalize nulls to empty strings)
        setUser({
          userName: userData.userName ?? "",
          firstName: userData.firstName ?? "",
          lastName: userData.lastName ?? "",
          email: userData.email ?? "",
          profilePicture: userData.profilePicture ?? "",
          id: userData.id ?? "",
          role: userData.role ?? ""
        });
      
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error fetching profile data. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [proServ]);
  
  // Load user data when component mounts
  useEffect(() => {
    // Fetch the current user's profile data on page load
    fetchUserData();
  }, [fetchUserData]);
  
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
    // Client-side validation
    const errors = { email: "", password: "" };
    const isValidEmail = (val) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(val || '').trim());
    const emailTrim = String(user.email || '').trim();
    if (!emailTrim) {
      errors.email = 'Email is required.';
    } else if (!isValidEmail(emailTrim)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (password) {
      const hasLowercase = /[a-z]/.test(password);
      const hasUppercase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
      const isLongEnough = password.length >= 8;
      if (!(hasLowercase && hasUppercase && hasNumber && hasSpecialChar && isLongEnough)) {
        errors.password = 'Password must be at least 8 chars and include lowercase, uppercase, number, and special character.';
      }
    }
    // Required fields: firstName, lastName
    if (!String(user.firstName || '').trim()) {
      errors.firstName = 'First name is required.';
    }
    if (!String(user.lastName || '').trim()) {
      errors.lastName = 'Last name is required.';
    }
    const hasErrors = Object.values(errors).some(Boolean);
    setFormErrors(errors);
    if (hasErrors) { setIsLoading(false); return; }
    
    try {
      // Prepare updated user data
      const updatedUserData = {
        ...user
      };
      
      // Add password if it was changed
      if (password) {
        updatedUserData.password = password;
      }
      
      // Call API to update user
      const response = await userServ.update(updatedUserData);
      
      if (response && !response.error) {
        if (password) {
          try {
          const mail = new MailService();
          const toEmail = updatedUserData.email || user.email;
          const resp = await mail.send({
            to: toEmail,
            template: 'password_changed',
            data: { }
          });
            if (!resp?.success) {
              setErrorDialogMessage(typeof resp?.error === 'string' ? resp.error : 'Failed to send password changed email');
              setErrorDialogOpen(true);
            }
          } catch (err) {
            setErrorDialogMessage(err?.message || 'Failed to send password changed email');
            setErrorDialogOpen(true);
          }
        }

        // Clear password field after successful update
        setPassword("");
        setPasswordStrength("");
        setPasswordStrengthColor("");
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Failed to update profile',
          text: 'Please try again.'
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while updating your profile.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  return (<>
    <div className="p-6 w-full max-w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Edit Your Profile</h1>
        <p className="text-muted-foreground">Manage your personal information and account preferences.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading profile information...</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-8">
            {/* Name Section */}
            <Card className="mb-6">
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
                        name="userName"
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
                      {formErrors.firstName ? (
                        <p className="text-xs text-red-600 mt-1">{formErrors.firstName}</p>
                      ) : null}
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
                      {formErrors.lastName ? (
                        <p className="text-xs text-red-600 mt-1">{formErrors.lastName}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info Section */}
            <Card className="mb-6">
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
                      {formErrors.email ? (
                        <p className="text-xs text-red-600">{formErrors.email}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        If you change this, an email will be sent at your new address to confirm it. The new address will not become active until confirmed.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Management Section */}
            <Card className="mb-6">
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
                        {formErrors.password ? (
                          <p className="text-xs text-red-600 mt-1">{formErrors.password}</p>
                        ) : null}
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9"
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
                        Leave blank to keep your current password.
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
                        value={user.role || undefined}
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

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                className="text-white" style={{ backgroundColor: "var(--chart-2)" }}
                disabled={isLoading}
              >
                {isLoading ? "Updating Profile..." : "Update Profile"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
    <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Error</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-red-600">{errorDialogMessage}</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setErrorDialogOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>);
}
