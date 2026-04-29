import { INDONESIA_HOLIDAYS_2026 } from './constants'

/**
 * Checks if a given date string (YYYY-MM-DD) is a weekend (Saturday or Sunday).
 * @param {string} dateStr 
 * @returns {boolean}
 */
export function isWeekend(dateStr) {
  if (!dateStr) return false
  // Using UTC to avoid timezone shifts when checking day of week
  const d = new Date(dateStr + 'T12:00:00') 
  const day = d.getDay()
  return day === 0 || day === 6 // 0 is Sunday, 6 is Saturday
}

/**
 * Checks if a given date string (YYYY-MM-DD) is a national holiday.
 * @param {string} dateStr 
 * @returns {boolean}
 */
export function isHoliday(dateStr) {
  return INDONESIA_HOLIDAYS_2026.includes(dateStr)
}

/**
 * Checks if a given date is either a weekend or a holiday.
 * @param {string} dateStr 
 * @returns {boolean}
 */
export function isOffDay(dateStr) {
  return isWeekend(dateStr) || isHoliday(dateStr)
}
