export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface CreateTimetableRequest {
  client_id?: string;
  academic_year?: string;
  academic_year_id?: string | null;
  class_id: string;
  section?: string | null;
  section_id?: string | null;
  day_of_week: DayOfWeek;
  period?: number | string | null;
  period_id?: string | null;
  subject_id: string;
  teacher_id: string;
  start_time?: string | null;
  end_time?: string | null;
  room_number?: string | null;
  is_active?: boolean;
  metadata?: Record<string, any>;
  created_by?: string;
  updated_by?: string;
}

export interface UpdateTimetableRequest {
  academic_year?: string;
  academic_year_id?: string | null;
  class_id?: string;
  section?: string | null;
  section_id?: string | null;
  day_of_week?: DayOfWeek;
  period?: number | string | null;
  period_id?: string | null;
  subject_id?: string;
  teacher_id?: string;
  start_time?: string | null;
  end_time?: string | null;
  room_number?: string | null;
  is_active?: boolean;
  metadata?: Record<string, any>;
  updated_by?: string;
}

export interface GetTimetableQuery {
  page?: string | number;
  limit?: string | number;
  academic_year?: string;
  academic_year_id?: string;
  class_id?: string;
  section?: string;
  section_id?: string;
  day_of_week?: DayOfWeek;
  period?: string | number;
  subject_id?: string;
  teacher_id?: string;
  is_active?: boolean | string;
}
