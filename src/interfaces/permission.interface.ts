export interface TokenPermissionInterface {
  permission_code: string[];
  actions: string[];
}

export interface PermissionInterface {
  id: string;
  name: string;
  code: string;
  category?: string;
  description?: string;
}
