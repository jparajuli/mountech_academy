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
}

export interface User {
  email: string;
  name: string;
  role: 'admin' | 'instructor' | 'student' | 'developer';
}
