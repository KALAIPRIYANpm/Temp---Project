/** Email normalization for login and manager accounts */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
