export interface SyllabusItem {
  chapter: string;
  title: string;
  description: string;
}

export interface Course {
  id: string;
  title: string;
  type: 'Short Course' | 'Course' | 'Professional Certificate';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  topic: string;
  description: string;
  fullDescription: string;
  instructorName: string;
  instructorTitle: string;
  instructorImage?: string;
  duration: string;
  lessonCount: string;
  rating: number;
  enrolledCount: string;
  partnerName?: string;
  partnerLogo?: string;
  skillsAcquired: string[];
  syllabus: SyllabusItem[];
  requirements: string[];
  thumbnailBg: string; // Tailwind bg class for card top banner
  thumbnailIconCode: string; // identifier for which graphic to display
  isPaid?: boolean;
  price?: number;
  isLocked?: boolean;
  syllabus_content?: string;
  instructor_profile_id?: number | null;
  instructor?: {
    name: string;
    title: string;
    avatar?: string;
  } | null;
  instructors?: {
    id?: string | number;
    name: string;
    title: string;
    avatar?: string;
  }[];
  instructor_ids?: (string | number)[];
}

export interface User {
  email: string;
  name: string;
  role: 'admin' | 'instructor' | 'student' | 'developer';
}

export interface LiveSession {
  id: number;
  course_id: string;
  title: string;
  start_time: string;
  end_time: string;
  meet_url?: string;
}

export interface InstructorProfile {
  id: number;
  user_email: string;
  full_name: string;
  academic_title: string;
  short_bio: string;
  linkedin_url?: string;
  avatar_url?: string;
}

export interface ExamQuestion {
  id?: number;
  exam_id?: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[];
  correct_answer: string;
  points: number;
}

export interface Exam {
  id?: number;
  course_id: string;
  title: string;
  description?: string;
  is_published: boolean;
  questions?: ExamQuestion[];
}


