'use client';

import { useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { forgetSchema } from "../utils/zodSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import Swal from 'sweetalert2';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function ForgetForm({ className, ...props }) {
  // Check registration enabled (mirror register form behavior)
  // If disabled, redirect to login
  // We do this client-side by querying the backend settings
  // and then replacing the location if sign-up is disabled
  if (typeof window !== 'undefined') {
    (async () => {
      try {
      const base = (await import('@/apiConfig.json')).default.ApiConfig.main;
      const sRes = await fetch(`${base}/bb-user/api/settings/get`, { credentials: 'include' });
        const sJson = await sRes.json();
        const enabled = typeof sJson?.settings?.sign_up_enabled === 'undefined' ? true : !!sJson.settings.sign_up_enabled;
        if (!enabled) {
          window.location.replace('/bb-auth/login');
        }
      } catch (_) {}
    })();
  }
  // Initialize form
  const form = useForm({
    resolver: zodResolver(forgetSchema),
    defaultValues: {
      email: "",
    },
  });

  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState("");
  const [successNotice, setSuccessNotice] = useState("");


  const formAction = async (formData)  => {

    // make a call to the JWT API server first to get a token
      const base = (await import('@/apiConfig.json')).default.ApiConfig.main;
      const res = await fetch(`${base}/bb-user/api/auth/forgetPassword`,{
        method: "POST",
        body: JSON.stringify(formData),
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json();
      if(data.error){
        Swal.fire({
          icon: 'error',
          title: `${data.error}`
        });
      } else {
        // Backend handles email sending; show subtle inline notice
        setSuccessNotice("If we find your account, we've sent a password reset link.");
      }
  }
  

  return (
    <>
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(formAction)} className="p-6 md:p-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <p className="text-balance text-muted-foreground">
                    Reset Password
                  </p>
                  {successNotice ? (
                    <p className="text-sm text-red-600 mt-2">{successNotice}</p>
                  ) : null}
                </div>

                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center">
                        <FormLabel>Email</FormLabel>
                        <a
                          href="/bb-auth/login"
                          className="ml-auto text-sm underline-offset-2 hover:underline"
                        >
                          Try to login again.
                        </a>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="m@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Reset Password
                </Button>

                <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <a href="/bb-auth/register" className="underline underline-offset-4">
                    Sign up
                  </a>
                </div>
              </div>
            </form>
          </Form>
          
          <div className="relative hidden bg-muted md:block">
            
            <Image
              src="/empty.png"
              alt="Image"
              fill
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
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
    </>
  );
}