export const getSessionInactivityWindowMs = (): number => {
  const configuredHours = Number(process.env.AUTH_INACTIVITY_HOURS || 24);
  const hours = Number.isFinite(configuredHours) && configuredHours > 0 ? configuredHours : 24;
  return hours * 60 * 60 * 1000;
};

export const getSessionActivityUpdateIntervalMs = (): number => {
  const configuredMinutes = Number(process.env.AUTH_ACTIVITY_UPDATE_INTERVAL_MINUTES || 5);
  const minutes = Number.isFinite(configuredMinutes) && configuredMinutes > 0 ? configuredMinutes : 5;
  return minutes * 60 * 1000;
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
