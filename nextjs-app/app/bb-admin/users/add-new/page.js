
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff } from "lucide-react";
import { userSchema } from "./utils/zodSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from 'sweetalert2';
import userService from "../../../../services/userService";
import MailService from "@/services/mailService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function UserAddNewPage() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [passwordStrengthColor, setPasswordStrengthColor] = useState("");
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState("");
  
  const userv = new userService();

  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      sendNotification: true,
      role: "Subscriber"
    }
  });

  const formAction = async (formData) => {

    const data = await userv.create(formData);

    if(data.error){
      Swal.fire({
        icon: 'error',
        title: `${data.error}`
      });
    }
    else{
      // Reset form
      form.reset({
        username: "",
        email: "",
        firstName: "",
        lastName: "",
        password: "",
        sendNotification: true,
        role: "Subscriber"
      });
      
      // Reset password strength indicators
      setPasswordStrength("");
      setPasswordStrengthColor("");
      setPasswordVisible(false);
      
      Swal.fire({
        icon: 'success',
        title: `User created`
      });

      // Send email if requested (backend handles templates)
      try {
        if (formData.sendNotification && data?.user?.email) {
          const mail = new MailService();
          const resp = await mail.send({
            to: data.user.email,
            template: 'user_created',
            data: { firstName: formData.firstName, lastName: formData.lastName, username: formData.username }
          });
          if (!resp?.success) {
            setErrorDialogMessage(typeof resp?.error === 'string' ? resp.error : 'Failed to send welcome email');
            setErrorDialogOpen(true);
          }
        }
      } catch (e) {
        setErrorDialogMessage(e?.message || 'Failed to send welcome email');
        setErrorDialogOpen(true);
      }
    }
  }

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

  const generateRandomPassword = () => {
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const specials = "!@#$%^&*()-_=+";
    const all = lower + upper + digits + specials;

    const pick = (pool) => pool[Math.floor(Math.random() * pool.length)];

    const required = [
      pick(lower),
      pick(upper),
      pick(digits),
      pick(specials)
    ];

    const targetLength = 12;
    const rest = [];
    for (let i = required.length; i < targetLength; i++) {
      rest.push(pick(all));
    }

    // Combine and shuffle (Fisher-Yates)
    const combined = required.concat(rest);
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = combined[i];
      combined[i] = combined[j];
      combined[j] = tmp;
    }

    const password = combined.join("");
    form.setValue("password", password);
    calculatePasswordStrength(password);
  };

  return (
    <div className="p-6 w-full max-w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Add New User</h1>
        <p className="text-muted-foreground">Create a brand new user and add them to this site.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(formAction)} className="space-y-4">
              {/* Username */}
              <FormField 
                control={form.control} 
                name="username" 
                render={({ field }) => (
                  <FormItem className="grid grid-cols-3 items-center">
                    <FormLabel className="text-sm font-medium">
                      Username <span className="text-red-500">*</span>
                    </FormLabel>
                    <div className="col-span-2">
                      <FormControl>
                        <Input placeholder="Enter a username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} 
              />
              
              {/* Email */}
              <FormField 
                control={form.control} 
                name="email" 
                render={({ field }) => (
                  <FormItem className="grid grid-cols-3 items-center">
                    <FormLabel className="text-sm font-medium">
                      Email <span className="text-red-500">*</span>
                    </FormLabel>
                    <div className="col-span-2">
                      <FormControl>
                        <Input type="email" placeholder="name@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} 
              />
              
              {/* First Name */}
              <FormField 
                control={form.control} 
                name="firstName" 
                render={({ field }) => (
                  <FormItem className="grid grid-cols-3 items-center">
                    <FormLabel className="text-sm font-medium">
                      First Name
                    </FormLabel>
                    <div className="col-span-2">
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} 
              />
              
              {/* Last Name */}
              <FormField 
                control={form.control} 
                name="lastName" 
                render={({ field }) => (
                  <FormItem className="grid grid-cols-3 items-center">
                    <FormLabel className="text-sm font-medium">
                      Last Name
                    </FormLabel>
                    <div className="col-span-2">
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} 
              />
              
              {/* Password */}
              <FormField 
                control={form.control} 
                name="password" 
                render={({ field }) => (
                  <FormItem className="grid grid-cols-3 items-start">
                    <FormLabel className="text-sm font-medium pt-2">
                      Password <span className="text-red-500">*</span>
                    </FormLabel>
                    <div className="col-span-2 space-y-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={generateRandomPassword}
                        className="mb-2"
                      >
                        Generate password
                      </Button>
                      
                      <div className="relative">
                        <FormControl>
                          <Input 
                            type={passwordVisible ? "text" : "password"}
                            placeholder="Enter a password" 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              calculatePasswordStrength(e.target.value);
                            }}
                          />
                        </FormControl>
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
                      <FormMessage />
                    </div>
                  </FormItem>
                )} 
              />
              
              {/* Send User Notification */}
              <FormField 
                control={form.control} 
                name="sendNotification" 
                render={({ field }) => (
                  <FormItem className="grid grid-cols-3 items-start">
                    <FormLabel className="text-sm font-medium pt-1">
                      Send User Notification
                    </FormLabel>
                    <div className="col-span-2 flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="text-sm">
                        Send the new user an email about their account.
                      </div>
                    </div>
                  </FormItem>
                )} 
              />
              
              {/* Role */}
              <FormField 
                control={form.control} 
                name="role" 
                render={({ field }) => (
                  <FormItem className="grid grid-cols-3 items-center">
                    <FormLabel className="text-sm font-medium">
                      Role <span className="text-red-500">*</span>
                    </FormLabel>
                    <div className="col-span-2 w-full">
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full max-w-xs">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Administrator">Administrator</SelectItem>
                            <SelectItem value="Subscriber">Subscriber</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} 
              />
              
              {/* Submit Button */}
              <div className="pt-4">
                <Button type="submit" className="text-white" style={{ backgroundColor: "var(--chart-2)" }}>
                  Add New User
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
