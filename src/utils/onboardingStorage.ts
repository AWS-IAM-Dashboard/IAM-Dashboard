const STORAGE_PREFIX = "iam-dashboard.onboarding.v1:";

function storageKey(username: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(username)}`;
}

/** Returns true if this user has finished or skipped onboarding in this browser. */
export function isOnboardingCompleted(username: string): boolean {
  if (!username) return true;
  try {
    return localStorage.getItem(storageKey(username)) != null;
  } catch {
    return false;
  }
}

/** Persist completion so the wizard is not shown again for this user on this device. */
export function markOnboardingCompleted(username: string): void {
  if (!username) return;
  try {
    localStorage.setItem(
      storageKey(username),
      JSON.stringify({ completedAt: new Date().toISOString() }),
    );
  } catch {
    /* quota or private mode */
  }
}