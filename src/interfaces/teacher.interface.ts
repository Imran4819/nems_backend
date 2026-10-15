export interface TeacherAddress {
  street?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  country?: string;
}

export interface CreateTeacherRequest {
  client_id?: string;
  user_id?: string;
  employee_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone: string;
  gender?: 'Male' | 'Female' | 'Other';
  date_of_birth?: string | Date;
  blood_group?: string;
  qualification?: string;
  specialization?: string;
  experience_years?: number;
  joining_date?: string | Date;
  status?: 'active' | 'inactive' | 'on_leave' | 'terminated';
  address?: TeacherAddress;
  profile_image?: string;
  metadata?: Record<string, any>;
  create_user_account?: boolean; // if true, creates User with Teacher role
  password?: string;
  created_by?: string;
  updated_by?: string;
}

export interface UpdateTeacherRequest {
  user_id?: string;
  employee_id?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gender?: 'Male' | 'Female' | 'Other';
  date_of_birth?: string | Date;
  blood_group?: string;
  qualification?: string;
  specialization?: string;
  experience_years?: number;
  joining_date?: string | Date;
  status?: 'active' | 'inactive' | 'on_leave' | 'terminated';
  address?: TeacherAddress;
  profile_image?: string;
  metadata?: Record<string, any>;
  password?: string;
  updated_by?: string;
}

export interface GetTeachersQuery {
  page?: string | number;
  limit?: string | number;
  k?: string; // search keyword
  status?: string;
  specialization?: string;
  qualification?: string;
}
