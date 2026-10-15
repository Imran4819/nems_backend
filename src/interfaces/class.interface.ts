export interface CreateClassRequest {
  client_id?: string;
  name: string; // e.g. "Grade 10", "12th Science", "BCA Semester 1"
  code?: string; // e.g. "G10-A", "BCA-S1"
  division?: string; // e.g. "A", "B"
  academic_year?: string; // e.g. "2025-2026"
  room_number?: string;
  capacity?: number;
  class_teacher_id?: string; // Teacher reference
  status?: 'active' | 'inactive' | 'archived';
  description?: string;
  metadata?: Record<string, any>;
  created_by?: string;
  updated_by?: string;
}

export interface UpdateClassRequest {
  name?: string;
  code?: string;
  division?: string;
  academic_year?: string;
  room_number?: string;
  capacity?: number;
  class_teacher_id?: string | null;
  status?: 'active' | 'inactive' | 'archived';
  description?: string;
  metadata?: Record<string, any>;
  updated_by?: string;
}

export interface GetClassesQuery {
  page?: string | number;
  limit?: string | number;
  k?: string; // search keyword
  division?: string;
  academic_year?: string;
  status?: string;
  class_teacher_id?: string;
}
