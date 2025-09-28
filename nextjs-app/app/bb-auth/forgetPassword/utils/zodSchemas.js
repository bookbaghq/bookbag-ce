"use client"
 
import { z } from "zod"


export const forgetSchema = z.object({
    email: z.string().email({
        message: "Please enter a valid email address",
    }),
});