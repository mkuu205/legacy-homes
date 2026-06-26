import { DateTime } from 'luxon';

const APP_TIMEZONE = 'Africa/Nairobi';

/**
 * Convert UTC date to Africa/Nairobi timezone
 */
export function convertToAppTimezone(date: Date | string): DateTime {
  const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
  return dt.setZone(APP_TIMEZONE);
}

/**
 * Get current time in app timezone
 */
export function getCurrentTimeInAppTimezone(): DateTime {
  return DateTime.now().setZone(APP_TIMEZONE);
}

/**
 * Format date in app timezone
 */
export function formatDateInAppTimezone(date: Date | string, format: string = 'dd MMM yyyy HH:mm z'): string {
  return convertToAppTimezone(date).toFormat(format);
}

/**
 * Format date for display (e.g., "30 Jul 2026 14:57 EAT")
 */
export function formatDateForDisplay(date: Date | string): string {
  return formatDateInAppTimezone(date, 'dd MMM yyyy HH:mm z');
}

/**
 * Format date for billing period (e.g., "01 Jul 2026 — 31 Jul 2026")
 */
export function formatBillingPeriod(startDate: Date | string, endDate: Date | string): string {
  const start = convertToAppTimezone(startDate).toFormat('dd MMM yyyy');
  const end = convertToAppTimezone(endDate).toFormat('dd MMM yyyy');
  return `${start} — ${end}`;
}

/**
 * Get billing period string (e.g., "01 Jul 2026 — 31 Jul 2026")
 */
export function getBillingPeriodString(month: string): { start: string; end: string } {
  const [year, monthNum] = month.split('-');
  const startDate = DateTime.fromISO(`${year}-${monthNum}-01`).setZone(APP_TIMEZONE);
  const endDate = startDate.endOf('month');

  return {
    start: startDate.toFormat('dd MMM yyyy'),
    end: endDate.toFormat('dd MMM yyyy'),
  };
}

/**
 * Calculate days until due
 */
export function calculateDaysUntilDue(dueDate: Date | string): number {
  const due = convertToAppTimezone(dueDate).startOf('day');
  const now = getCurrentTimeInAppTimezone().startOf('day');
  return Math.ceil(due.diff(now, 'days').days);
}

/**
 * Calculate overdue days
 */
export function calculateOverdueDays(dueDate: Date | string): number {
  const days = calculateDaysUntilDue(dueDate);
  return days < 0 ? Math.abs(days) : 0;
}

/**
 * Check if bill is overdue
 */
export function isBillOverdue(dueDate: Date | string): boolean {
  return calculateDaysUntilDue(dueDate) < 0;
}

/**
 * Get due date for a billing month (e.g., 3 days after month end)
 */
export function calculateDueDate(billingMonth: string, daysAfterMonthEnd: number = 3): DateTime {
  const [year, monthNum] = billingMonth.split('-');
  const startDate = DateTime.fromISO(`${year}-${monthNum}-01`).setZone(APP_TIMEZONE);
  const monthEnd = startDate.endOf('month');
  return monthEnd.plus({ days: daysAfterMonthEnd }).set({ hour: 23, minute: 59, second: 59 });
}

/**
 * Sort dates chronologically
 */
export function sortDatesChronologically(dates: (Date | string)[]): DateTime[] {
  return dates
    .map(d => convertToAppTimezone(d))
    .sort((a, b) => a.toMillis() - b.toMillis());
}

/**
 * Sort billing months chronologically
 */
export function sortBillingMonthsChronologically(months: string[]): string[] {
  return months.sort((a, b) => {
    const [yearA, monthA] = a.split('-');
    const [yearB, monthB] = b.split('-');

    if (yearA !== yearB) {
      return parseInt(yearA) - parseInt(yearB);
    }

    return parseInt(monthA) - parseInt(monthB);
  });
}
