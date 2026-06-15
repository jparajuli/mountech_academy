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

export const SyllabusItemSchema = z.object({
  chapter: z.string().trim().min(1, { message: "Syllabus chapter label is required." }),
  title: z.string().trim().min(1, { message: "Syllabus chapter title is required." }),
  description: z.string().trim().min(1, { message: "Syllabus chapter description is required." }),
});

export const AdminCourseSchema = z.object({
  title: z.string().trim().min(1, { message: "Course title is required." }),
  type: z.enum(['Short Course', 'Course', 'Professional Certificate']).default('Short Course'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
  topic: z.string().trim().min(1, { message: "Topic is required." }),
  description: z.string().trim().min(1, { message: "Description is required." }),
  fullDescription: z.string().trim().min(1, { message: "Full description is required." }),
  instructorName: z.string().trim().min(1, { message: "Instructor name is required." }),
  instructorTitle: z.string().trim().min(1, { message: "Instructor title is required." }),
  duration: z.string().trim().min(1, { message: "Duration is required." }),
  lessonCount: z.string().trim().min(1, { message: "Lesson count is required." }),
  partnerName: z.string().trim().optional().nullable(),
  skillsAcquired: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  syllabus: z.array(SyllabusItemSchema).min(1, { message: "At least one syllabus item is required." }),
  thumbnailBg: z.string().trim().default("bg-slate-900 text-slate-100"),
  thumbnailIconCode: z.string().trim().default("default"),
  isPaid: z.boolean().default(false),
  price: z.number().default(0),
});

export const LiveSessionSchema = z.object({
  title: z.string().trim().min(1, { message: "Session title is required." }),
  start_time: z.string().trim().min(1, { message: "Start time is required." }),
  end_time: z.string().trim().min(1, { message: "End time is required." }),
  meet_url: z.string().trim().url({ message: "A valid Google Meet or meeting URL is required." }),
});


