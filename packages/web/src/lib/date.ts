/**
 * Format a date to a localized string with year, month, and day
 * @param date - The date to format
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
