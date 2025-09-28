'use client';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { loginSchema } from "../utils/zodSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import Swal from 'sweetalert2';
import { redirect } from "next/navigation";
import Image from 'next/image';
import credentials from "../../../../services/credentials";

export function LoginForm({ className, ...props }) {
      var cred = new credentials();

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  })

  const formAction = async (formData)  => {
    // make a call to the JWT API server first to get a token

      const data = await cred.login(formData);

      if(data.error){
        Swal.fire({
          icon: 'error',
          title: `${data.error}`
        });
      }
      else{
        redirect('/bb-client');
      }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(formAction)} className="p-6 md:p-8 space-y-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">
                  Login to your account
                </p>
              </div>
              
              <FormField 
                control={form.control} 
                name="email" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              
              <FormField 
                control={form.control} 
                name="password" 
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center">
                      <FormLabel>Password</FormLabel>
                      <a
                        href="/bb-auth/forgetPassword"
                        className="ml-auto text-sm underline-offset-2 hover:underline"
                      >
                        Forgot your password?
                      </a>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="Password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              
              <Button type="submit" className="w-full cursor-pointer">
                Login
              </Button>
              
              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <a href="/bb-auth/register" className="underline underline-offset-4">
                  Sign up
                </a>
              </div>
            </form>
          </Form>
          <div className="relative hidden bg-muted md:block">
            <Image
                src="/empty.png"
                alt="Image"
                fill
                className="object-cover dark:brightness-[0.2] dark:grayscale"
              />
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}