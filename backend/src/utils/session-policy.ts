export const getSessionInactivityWindowMs = (): number => {
  const configuredHours = Number(process.env.AUTH_INACTIVITY_HOURS || 24);
  const hours = Number.isFinite(configuredHours) && configuredHours > 0 ? configuredHours : 24;
  return hours * 60 * 60 * 1000;
};

export const isSessionInactive = (
  lastActivityAt: Date | null,
  createdAt: Date,
  now = new Date(),
): boolean => {
  const lastActivity = lastActivityAt ?? createdAt;
  return now.getTime() - lastActivity.getTime() >= getSessionInactivityWindowMs();
};

export const SESSION_EXPIRED_MESSAGE = 'Your session has expired due to inactivity. Please log in again.';
