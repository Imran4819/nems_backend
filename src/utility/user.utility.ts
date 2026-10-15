export class UserUtility {
  static validateCountryCode(code?: string): string {
    if (!code || typeof code !== 'string') return '+91';
    const trimmed = code.trim();
    return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
  }

  static normalizeRole(roleName?: string): string {
    if (!roleName) return '';
    const clean = roleName.trim().toLowerCase().replace(/[\s_-]/g, '');
    if (clean === 'superadmin' || clean === 'sa') return 'Super Admin';
    if (clean === 'incharge' || clean === 'ic') return 'Incharge';
    if (clean === 'admin') return 'Admin';
    if (clean === 'teacher') return 'Teacher';
    if (clean === 'student') return 'Student';
    return roleName;
  }
}

export default UserUtility;
