"use client"
 
import { z } from "zod"
 
export const registerSchema = z.object({
  firstName: z.string()
  .min(2, { message: "First name must be at least 2 characters" })
  .max(50, { message: "First name must be less than 50 characters" }),

  lastName: z.string()
    .min(2, { message: "Last name must be at least 2 characters" })
    .max(50, { message: "Last name must be less than 50 characters" }),

  email: z.string()
    .email({ message: "Please enter a valid email address" }),
    password: z.string()
      .min(3, { message: "Password must be at least 3 characters" }),
      //.regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
      //.regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
      //.regex(/[0-9]/, { message: "Password must contain at least one number" })
      //.regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" }),

    confirmPassword: z.string()
    }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
    });