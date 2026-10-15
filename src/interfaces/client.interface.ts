export interface CreateClientRequest {
  orgn_name: string;
  orgn_type?: string;
  logo?: string | null;
  address?: string | null;
  tagline?: string;
  orgn_email?: string;
  orgn_phone?: string;
  orgn_website?: string;
  short_name?: string;
  domain?: string;
  admin_name?: string;
  admin_phone?: string;
  admin_email?: string;
  status?: 'active' | 'inactive' | 'pending';
  country?: string;
  timezone?: string;
  language?: string;
  parent_orgn_id?: string | null;
  custom_fields?: Record<string, any>;
  created_by?: string;
}

export interface UpdateClientRequest {
  orgn_name?: string;
  orgn_type?: string;
  logo?: string | null;
  address?: string | null;
  tagline?: string;
  orgn_email?: string;
  orgn_phone?: string;
  orgn_website?: string;
  short_name?: string;
  domain?: string;
  admin_name?: string;
  admin_phone?: string;
  admin_email?: string;
  status?: 'active' | 'inactive' | 'pending';
  country?: string;
  timezone?: string;
  language?: string;
  custom_fields?: Record<string, any>;
  updated_by?: string;
}

export interface GetClientsQuery {
  page?: string | number;
  limit?: string | number;
  k?: string;
  status?: string;
  orgn_type?: string;
}
