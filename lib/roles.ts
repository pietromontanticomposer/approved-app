export type AccessRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export function roleCanAccess(role: AccessRole | null): boolean {
  return role === 'owner' || role === 'editor' || role === 'commenter' || role === 'viewer';
}

export function roleCanReview(role: AccessRole | null): boolean {
  return role === 'owner' || role === 'editor' || role === 'commenter';
}

export function roleCanModify(role: AccessRole | null): boolean {
  return role === 'owner' || role === 'editor';
}
