/** While true, onAuthStateChange must not overwrite the admin session (e.g. during manager signUp). */
let paused = false;

export function pauseAuthSync(): void {
  paused = true;
}

export function resumeAuthSync(): void {
  paused = false;
}

export function isAuthSyncPaused(): boolean {
  return paused;
}
