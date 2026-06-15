import { z } from "zod";

export const CreateInstructorProfileSchema = z.object({
  user_email: z.string().trim().email({ message: "A valid registered user email is required." }),
  full_name: z.string().trim().min(1, { message: "Full name is required." }),
  academic_title: z.string().trim().min(1, { message: "Academic title is required." }),
  short_bio: z.string().trim().max(500, { message: "Bio must be 500 characters or fewer." }).optional().nullable().default(""),
  linkedin_url: z.string().trim().url({ message: "A valid URL is required for LinkedIn." }).or(z.literal("")).optional().nullable().default(""),
  avatar_url: z.string().trim().url({ message: "A valid image URL is required for your avatar." }).or(z.literal("")).optional().nullable().default(""),
});

export const UpdateInstructorProfileSchema = z.object({
  full_name: z.string().trim().min(1, { message: "Full name is required." }),
  academic_title: z.string().trim().min(1, { message: "Academic title is required." }),
  short_bio: z.string().trim().max(500, { message: "Bio must be 500 characters or fewer." }).optional().nullable().default(""),
  linkedin_url: z.string().trim().url({ message: "A valid URL is required for LinkedIn." }).or(z.literal("")).optional().nullable().default(""),
  avatar_url: z.string().trim().url({ message: "A valid image URL is required for your avatar." }).or(z.literal("")).optional().nullable().default(""),
});
