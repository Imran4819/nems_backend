export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'excused' | 'on_leave';
export type AttendanceUserType = 'student' | 'teacher';

export interface CreateAttendanceRequest {
  client_id?: string;
  user_type: AttendanceUserType;
  student_id?: string | null;
  teacher_id?: string | null;
  class_id?: string | null;
  subject_id?: string | null;
  date: string | Date; // e.g. "2026-10-12"
  status: AttendanceStatus;
  check_in_time?: string | null;
  check_out_time?: string | null;
  late_minutes?: number | null;
  remark?: string | null;
  metadata?: Record<string, any> | null;
  created_by?: string;
  updated_by?: string;
}

export interface UpdateAttendanceRequest {
  status?: AttendanceStatus;
  check_in_time?: string | null;
  check_out_time?: string | null;
  late_minutes?: number | null;
  remark?: string | null;
  metadata?: Record<string, any> | null;
  updated_by?: string;
}

export interface BulkAttendanceItem {
  student_id?: string;
  teacher_id?: string;
  status: AttendanceStatus;
  check_in_time?: string | null;
  check_out_time?: string | null;
  late_minutes?: number | null;
  remark?: string | null;
}

export interface BulkAttendanceRequest {
  client_id?: string;
  date: string | Date;
  user_type: AttendanceUserType;
  class_id?: string | null;
  subject_id?: string | null;
  records: BulkAttendanceItem[];
  created_by?: string;
}

export interface GetAttendanceQuery {
  page?: string | number;
  limit?: string | number;
  user_type?: AttendanceUserType;
  student_id?: string;
  teacher_id?: string;
  class_id?: string;
  subject_id?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  status?: AttendanceStatus | string;
}
