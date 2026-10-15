export interface CreateSubjectRequest {
  client_id?: string;
  name: string; // e.g. "Physics", "Linear Algebra", "English Literature"
  code: string; // e.g. "PHY101", "MATH201"
  description?: string;
  class_id?: string; // Foreign key to classes
  teacher_id?: string; // Foreign key to teachers (explicitly requested)
  credits?: number;
  total_marks?: number;
  passing_marks?: number;
  is_elective?: boolean;
  status?: 'active' | 'inactive';
  metadata?: Record<string, any>;
  created_by?: string;
  updated_by?: string;
}

export interface UpdateSubjectRequest {
  name?: string;
  code?: string;
  description?: string;
  class_id?: string | null;
  teacher_id?: string | null;
  credits?: number;
  total_marks?: number;
  passing_marks?: number;
  is_elective?: boolean;
  status?: 'active' | 'inactive';
  metadata?: Record<string, any>;
  updated_by?: string;
}

export interface GetSubjectsQuery {
  page?: string | number;
  limit?: string | number;
  k?: string; // search keyword
  class_id?: string;
  teacher_id?: string;
  status?: string;
  is_elective?: string | boolean;
}
