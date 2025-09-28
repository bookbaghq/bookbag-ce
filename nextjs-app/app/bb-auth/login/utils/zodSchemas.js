"use client"
 
import { z } from "zod"
 
export const loginSchema = z.object({
    email : z.string().email("This is not a valid email."),
    password: z.string().min(3, "Password must be at least 3 characters" ).max(20, "Password must be at most 13 character")

  });