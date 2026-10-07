/** Turn Auth / DB / network errors into plain language for end users. */

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  if (typeof error === "string") return error;
  return "";
}

function extractCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}

function looksTechnical(message: string): boolean {
  return (
    /supabase|postgres|postgrest|pgrst|jwt|rls|vite_|^\.env\b|column|relation|constraint|violates|foreign key|duplicate key|stack|exception|undefined|null reference|ECONN|fetch failed|networkerror|authapi|profiles\.|branch_id|roll_number/i.test(
      message,
    ) ||
    /^[A-Z0-9_]{6,}$/.test(message.trim()) ||
    message.length > 160
  );
}

function mapKnownError(code: string, message: string): string | null {
  const m = message.trim();
  const lower = m.toLowerCase();

  if (
    /supabase is not configured|vite_supabase|\.env/i.test(m) ||
    /add your project keys/i.test(m)
  ) {
    return "The app isn't set up correctly. Please contact an administrator.";
  }

  if (/no profile found|add a row in profiles/i.test(m)) {
    return "Your account isn't fully set up. Please contact an administrator.";
  }

  if (
    /invalid login credentials|invalid email or password|email.*password.*incorrect/i.test(m)
  ) {
    return "Email or password is incorrect.";
  }

  if (/email not confirmed/i.test(m)) {
    return "This email isn't confirmed yet. Contact an administrator.";
  }

  if (/user already registered|already been registered/i.test(m)) {
    return "An account with this email already exists.";
  }

  if (
    code === "over_email_send_rate_limit" ||
    /rate limit|too many requests|too many sign-up/i.test(m)
  ) {
    return "Too many attempts. Please wait a while and try again.";
  }

  if (/refresh token|jwt expired|session.*expired|invalid.*jwt/i.test(m)) {
    return "Your session expired. Please sign in again.";
  }

  if (
    /failed to fetch|networkerror|network request failed|load failed|err_network|econnrefused|enotfound/i.test(
      m,
    )
  ) {
    return "Couldn't connect. Check your internet and try again.";
  }

  if (
    code === "42501" ||
    /permission denied|row-level security|rls|not authorized|forbidden/i.test(m)
  ) {
    return "You don't have permission to do that.";
  }

  if (code === "23505" || /duplicate key|unique constraint/i.test(m)) {
    if (/roll_number|roll number/i.test(m)) {
      return "This roll number is already assigned to another student.";
    }
    if (/email/i.test(m)) {
      return "An account with this email already exists.";
    }
    return "That record already exists.";
  }

  if (code === "23503" || /foreign key|violates foreign key/i.test(m)) {
    return "Can't remove this while it's still linked to other records. Try deactivating it instead.";
  }

  if (/PGRST|JSON object requested|results contain/i.test(m) || code.startsWith("PGRST")) {
    return "Couldn't load that data. Please try again.";
  }

  if (/already marked present/i.test(m)) {
    return m;
  }

  // Keep short, already-friendly app messages as-is
  if (m && !looksTechnical(m) && m.length <= 140) {
    return m;
  }

  if (lower) {
    /* fall through */
  }
  return null;
}

/**
 * Map any thrown/returned error into a short message safe to show end users.
 * Always prefer a known mapping over raw Auth/DB text.
 */
export function toUserMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const message = extractMessage(error);
  const code = extractCode(error);
  return mapKnownError(code, message) ?? fallback;
}

/** @deprecated Prefer toUserMessage — kept for existing db call sites. */
export function getDbErrorMessage(error: unknown): string {
  return toUserMessage(error);
}

export function isMissingBranchIdColumn(message: string): boolean {
  return /branch_id/i.test(message);
}
