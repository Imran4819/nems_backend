export interface CreateRoleRequest {
  name: string;
  short_code: string;
  description?: string | null;
  client_id?: string;
  is_system?: boolean;
  is_public?: boolean;
  permissions?: string[];
  created_by?: string;
  updated_by?: string;
}

export interface CreateRoleInput {
  name: string;
  short_code: string;
  description?: string | null;
  client_id: string;
  is_system?: boolean;
  is_public?: boolean;
  permissions?: string[];
  created_by?: string;
  updated_by?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  short_code?: string;
  description?: string | null;
  permissions?: string[];
  is_system?: boolean;
  is_public?: boolean;
  updated_by?: string;
}

export interface UpdateRoleInput {
  name?: string;
  short_code?: string;
  description?: string | null;
  permissions?: string[];
  is_system?: boolean;
  is_public?: boolean;
  updated_by?: string;
}

export interface SetPermissionsRequest {
  permissions: string[];
}
