/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Returns today's date formatted as 'YYYY-MM-DD' based on the local client timezone.
 * Avoids UTC day-shift bugs by utilizing local Date getters.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats an ISO or 'YYYY-MM-DD' date string into localized Indonesian date display (e.g., 03 Nov 2026).
 */
export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Calculates duration between two 'HH:mm' time strings.
 * Handles exact hours, hour + minutes, minutes only, and overnight cross-midnight events.
 * Returns duration in hours, minutes, and human-friendly Indonesian text (e.g., '1 Jam', '4 Jam 30 Menit').
 */
export function calculateTimeDuration(startTime?: string, endTime?: string): {
  durationHours: number;
  durationMinutes: number;
  durationText: string;
} {
  if (!startTime || !endTime) {
    return { durationHours: 0, durationMinutes: 0, durationText: '-' };
  }

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
    return { durationHours: 0, durationMinutes: 0, durationText: '-' };
  }

  const startTotalMin = startH * 60 + startM;
  let endTotalMin = endH * 60 + endM;

  let isNextDay = false;
  // If end time is earlier or equal, handle midnight rollover (e.g. 20:00 to 02:00)
  if (endTotalMin < startTotalMin) {
    endTotalMin += 24 * 60;
    isNextDay = true;
  } else if (endTotalMin === startTotalMin) {
    return { durationHours: 0, durationMinutes: 0, durationText: '0 Menit' };
  }

  const diffMin = endTotalMin - startTotalMin;
  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;

  let text = '';
  if (hours > 0 && minutes > 0) {
    text = `${hours} Jam ${minutes} Menit`;
  } else if (hours > 0) {
    text = `${hours} Jam`;
  } else {
    text = `${minutes} Menit`;
  }

  if (isNextDay && hours > 0) {
    text += ' (Lintas Hari)';
  }

  const durationHours = parseFloat((diffMin / 60).toFixed(2));
  return { durationHours, durationMinutes: diffMin, durationText: text };
}
