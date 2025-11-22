/**
 * Filter display utilities for converting filter objects to natural language
 */

import { formatPriority } from '@/types/priority';

/**
 * Filter state interface representing active task filters
 */
export interface FilterState {
  priority?: number;
  scheduled?: string; // ISO 8601 date string
  query?: string;
  tags?: string[];
  completed?: boolean;
}

/**
 * Format a date as "today", "tomorrow", or a specific date string
 * @param dateString - ISO 8601 date string
 * @returns Human-readable date description
 */
function formatScheduledDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset time components for date comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    if (dateOnly.getTime() === nowOnly.getTime()) {
      return "today's";
    } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
      return "tomorrow's";
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  } catch (error) {
    console.error('Error formatting scheduled date:', error);
    return dateString;
  }
}

/**
 * Convert filter state to natural language description
 * @param filter - Filter state object or null
 * @returns Human-readable filter description
 */
export function formatFilterDisplay(filter: FilterState | null | undefined): string {
  if (!filter) {
    return 'Tap to speak';
  }

  const parts: string[] = [];

  // Priority filter
  if (filter.priority !== undefined && filter.priority !== null) {
    const priorityLabel = formatPriority(filter.priority);
    if (priorityLabel) {
      parts.push(`${priorityLabel.toLowerCase()} priority`);
    } else {
      parts.push(`priority ${filter.priority}`);
    }
  }

  // Scheduled filter
  if (filter.scheduled) {
    const formattedDate = formatScheduledDate(filter.scheduled);
    parts.push(formattedDate);
  }

  // Query filter
  if (filter.query && filter.query.trim()) {
    parts.push(`"${filter.query.trim()}"`);
  }

  // Tags filter
  if (filter.tags && filter.tags.length > 0) {
    const tagList = filter.tags.map(t => `#${t}`).join(', ');
    parts.push(tagList);
  }

  // Completed filter
  if (filter.completed !== undefined && filter.completed !== null) {
    const statusText = filter.completed ? 'completed' : 'incomplete';
    parts.push(statusText);
  }

  // Return formatted message
  if (parts.length === 0) {
    return 'Showing all tasks';
  }

  return `Showing ${parts.join(' ')} tasks`;
}

/**
 * Safe wrapper for formatFilterDisplay that handles errors gracefully
 * @param filter - Filter state object or null
 * @returns Human-readable filter description or fallback message
 */
export function safeFormatFilterDisplay(filter: FilterState | null | undefined): string {
  try {
    return formatFilterDisplay(filter);
  } catch (error) {
    console.error('Error formatting filter display:', error);
    return 'Tap to speak';
  }
}
