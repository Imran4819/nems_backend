export interface CreateUserRequest {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone: string;
  password?: string;
  role_id?: string;
  role_name?: string; // e.g. 'superadmin', 'incharge', 'admin', 'teacher', 'student'
  status?: 'active' | 'inactive' | 'locked' | 'blocked' | 'pending';
  gender?: 'Male' | 'Female' | 'Other';
  date_of_birth?: string | Date;
  profile_image?: string | null;
  employee_id?: string;
  joining_date?: string | Date;
  official_email?: string;
  designation?: string;
  department_id?: string;
  location_id?: string;
  manager_id?: string;
  country_code?: string;
  created_by?: string;
  updated_by?: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  role_id?: string;
  status?: 'active' | 'inactive' | 'locked' | 'blocked' | 'pending';
  gender?: 'Male' | 'Female' | 'Other';
  date_of_birth?: string | Date;
  profile_image?: string | null;
  employee_id?: string;
  joining_date?: string | Date;
  official_email?: string;
  designation?: string;
  manager_id?: string;
  country_code?: string;
  updated_by?: string;
}

export interface GetUsersQuery {
  page?: string | number;
  limit?: string | number;
  k?: string;
  role_id?: string;
  role_name?: string;
  status?: string;
  manager_id?: string;
}
