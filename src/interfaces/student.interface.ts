export interface StudentAddress {
  street?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  country?: string;
}

export interface CreateStudentRequest {
  client_id?: string;
  user_id?: string;
  teacher_id?: string;
  enrollment_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone: string;
  gender?: 'Male' | 'Female' | 'Other';
  date_of_birth?: string | Date;
  blood_group?: string;
  address?: StudentAddress;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  guardian_relation?: string;
  academic_year?: string;
  class_name?: string;
  division?: string;
  roll_number?: string;
  admission_date?: string | Date;
  status?: 'active' | 'inactive' | 'graduated' | 'suspended' | 'withdrawn';
  profile_image?: string;
  metadata?: Record<string, any>;
  create_user_account?: boolean; // if true, automatically creates a User and UserMapping with role 'student'
  password?: string;
  created_by?: string;
  updated_by?: string;
}

export interface UpdateStudentRequest {
  user_id?: string;
  teacher_id?: string;
  enrollment_number?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gender?: 'Male' | 'Female' | 'Other';
  date_of_birth?: string | Date;
  blood_group?: string;
  address?: StudentAddress;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  guardian_relation?: string;
  academic_year?: string;
  class_name?: string;
  division?: string;
  roll_number?: string;
  admission_date?: string | Date;
  status?: 'active' | 'inactive' | 'graduated' | 'suspended' | 'withdrawn';
  profile_image?: string;
  metadata?: Record<string, any>;
  password?: string;
  updated_by?: string;
}

export interface GetStudentsQuery {
  page?: string | number;
  limit?: string | number;
  k?: string; // search keyword
  status?: string;
  class_name?: string;
  division?: string;
  academic_year?: string;
  teacher_id?: string;
}
