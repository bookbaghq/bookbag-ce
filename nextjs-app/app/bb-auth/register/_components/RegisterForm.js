'use client';

import { useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { registerSchema } from "../utils/zodSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import Swal from 'sweetalert2';
import Image from 'next/image';
import credentials from "../../../../services/credentials";
import { useRouter } from "next/navigation";

export function RegisterForm({ className, ...props }) {
    const router = useRouter();
    var cred = new credentials();
    const [errorDialogOpen, setErrorDialogOpen] = useState(false);
    const [errorDialogMessage, setErrorDialogMessage] = useState("");
    
    const form = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            confirmPassword: ""
        }
    });

    const formAction = async (formData) => {
        const data = await cred.register(formData);

        if (data.error) {
            Swal.fire({
                icon: 'error',
                title: `${data.error}`
            });
        }
        else {
            // Success: backend handles any emails; just redirect
            router.replace('/bb-client');
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
                                    <h1 className="text-2xl font-bold">Thank you for joining</h1>
                                    <p className="text-balance text-muted-foreground">
                                        Register to your account
                                    </p>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>First Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Last Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="m@example.com" {...field} />
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
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password Confirmation</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" className="w-full cursor-pointer ">
                                    Register
                                </Button>

                                <div className="text-center text-sm">
                                    Do you have an account?{" "}
                                    <a href="/bb-auth/login" className="underline underline-offset-4">
                                        Sign in
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
        </>
    );
}