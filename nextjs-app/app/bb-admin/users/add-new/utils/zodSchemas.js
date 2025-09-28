"use client"
 
import { z } from "zod"
 
export const userSchema = z.object({

      username: z
        .string()
        .trim()
        .min(3, "Username must be at least 3 characters")
        .max(20, "Username must be at most 20 characters")
        .regex(/^[A-Za-z0-9._-]+$/, "Username can only contain letters, numbers, dots, underscores, and hyphens"),
      email: z
        .string()
        .trim()
        .min(1, "Email is required")
        .email("Please enter a valid email address"),
      firstName: z
        .string()
        .trim()
        .max(30, "First name must be at most 30 characters")
        .optional()
        .or(z.literal("")),
      lastName: z
        .string()
        .trim()
        .max(30, "Last name must be at most 30 characters")
        .optional()
        .or(z.literal("")),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(64, "Password must be at most 64 characters")
        .refine((val) => /[a-z]/.test(val), "Password must include a lowercase letter")
        .refine((val) => /[A-Z]/.test(val), "Password must include an uppercase letter")
        .refine((val) => /\d/.test(val), "Password must include a number")
        .refine((val) => /[^A-Za-z0-9]/.test(val), "Password must include a special character"),
      sendNotification: z.boolean(),
      role: z.enum(["Administrator", "Subscriber"], {
        errorMap: () => ({ message: "Please select a valid role" })
      }),

  });
