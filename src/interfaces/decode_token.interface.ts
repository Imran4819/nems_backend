export interface DecodedToken {
  user_id: string;
  user_type: string;
  clients: Record<string, string> | any[];
  token_version?: number;
  impersonator_user_id?: string | null;
  email?: string;
  phone?: string;
}
