import { z } from "zod";

export const RegisterSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email address is required" })
    .email({ message: "Please provide a valid and complete real email address." }),
  name: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters long." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long." }),
});

export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email structure" }),
  password: z
    .string()
    .min(1, { message: "Password is required" }),
});

export const ResendVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email" }),
});

export const UpdateRoleSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email parameter is mandatory" })
    .email({ message: "Invalid email format" }),
  role: z.enum(["student", "instructor", "admin", "developer"], {
    message: "Invalid role parameter. Permitted values: student, instructor, admin, developer"
  }),
});

export const ResetPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Please provide a valid and complete real email address." }),
  newPassword: z
    .string()
    .min(6, { message: "New password must be at least 6 characters long." }),
});

export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Please provide a valid and complete real email address." }),
});

export const ResetPasswordWithTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, { message: "Reset token is required" }),
  newPassword: z
    .string()
    .min(6, { message: "New password must be at least 6 characters long." }),
});

