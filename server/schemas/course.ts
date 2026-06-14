import { z } from "zod";

export const EnrollSchema = z.object({
  courseId: z
    .string()
    .trim()
    .min(1, { message: "courseId is required to enroll." }),
  courseTitle: z
    .string()
    .trim()
    .min(1, { message: "courseTitle is required to enroll." }),
});

export const CompleteSchema = z.object({
  courseId: z
    .string()
    .trim()
    .min(1, { message: "courseId is required to complete a course." }),
});

export const RatingSchema = z.object({
  courseId: z
    .string()
    .trim()
    .min(1, { message: "courseId is required to submit a rating." }),
  rating: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((num) => num >= 1 && num <= 5, {
      message: "Rating score must be a number between 1 and 5.",
    }),
  review: z
    .string()
    .trim()
    .optional()
    .default(""),
});
