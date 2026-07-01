export type AdminAccessVerification = {
  status: 'ok' | 'unauthorized' | 'forbidden' | 'unavailable' | 'server_error';
  message?: string;
};

export type AdminFetchError = Error & {
  status?: number;
  missingEnv?: string[];
  hint?: string;
};

export function formatAdminUnavailableMessage(error: AdminFetchError): string {
  const missing = error.missingEnv?.filter(Boolean) ?? [];
  if (missing.length === 0) {
    return 'Admin system is not configured on the server.';
  }
  const hint = error.hint?.trim();
  return `Admin system is not configured. Missing: ${missing.join(', ')}.${hint ? ` ${hint}` : ''}`;
}

function isNotConfigured503(error: AdminFetchError): boolean {
  const missing = error.missingEnv?.filter(Boolean) ?? [];
  if (missing.length > 0) return true;

  const message = error.message?.trim() ?? '';
  if (message === 'Admin system is not configured on the server.') return true;
  if (/admin api is only available/i.test(message)) return true;

  return false;
}

export function classifyAdminAccessError(error: unknown): AdminAccessVerification {
  const err = error as AdminFetchError;
  const status = err.status;
  const message = err.message?.trim() ?? '';

  if (status === 401 || /sign in required/i.test(message)) {
    return {
      status: 'unauthorized',
      message: 'Sign in with an admin account to continue.',
    };
  }

  if (status === 403 || /admin access required/i.test(message)) {
    return {
      status: 'forbidden',
      message: 'You do not have permission to access the admin dashboard.',
    };
  }

  if (status === 503) {
    if (isNotConfigured503(err)) {
      return { status: 'unavailable', message: formatAdminUnavailableMessage(err) };
    }
    return {
      status: 'server_error',
      message:
        message && !/^Request failed/i.test(message)
          ? message
          : 'Admin dashboard is temporarily unavailable. Try again in a moment.',
    };
  }

  if (status === 502) {
    return {
      status: 'server_error',
      message:
        message && !/^Request failed/i.test(message)
          ? message
          : 'Admin dashboard is temporarily unavailable. Try again in a moment.',
    };
  }

  if (/admin api is only available/i.test(message)) {
    return { status: 'unavailable', message };
  }

  if (message) {
    return { status: 'forbidden', message };
  }

  return {
    status: 'forbidden',
    message: 'You do not have permission to access the admin dashboard.',
  };
}
