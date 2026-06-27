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

export const UpdateSyllabusSchema = z.object({
  syllabus_content: z.string().optional().nullable(),
  syllabus: z.array(z.any()).optional().nullable(),
  clientLastUpdatedAt: z.string().optional().nullable(),
});

export const CreateExamSchema = z.object({
  title: z.string().trim().min(1, { message: "Exam title is required." }),
  description: z.string().trim().optional().nullable().default(""),
  is_published: z.any().optional().default(0), // 0 or 1 or boolean
  questions_to_display: z.number().int().min(1).optional().default(5),
  passing_score_percentage: z.number().int().min(1).max(100).optional().default(70),
  duration_minutes: z.number().int().min(1).optional().default(30),
  exam_type: z.enum(["lesson", "final"]).optional().default("final"),
  lesson_id: z.number().int().optional().nullable(),
  quiz_data: z.any().optional().nullable(),
});

export const CreateQuestionSchema = z.object({
  question_text: z.string().trim().min(1, { message: "Question text is required." }),
  question_type: z.enum(["multiple_choice", "true_false", "short_answer"]),
  options: z.array(z.string()).optional().nullable(),
  correct_answer: z.string().trim().min(1, { message: "Correct answer is required." }),
  points: z.number().int().min(1, { message: "Points must be at least 1." }).optional().default(1),
});
