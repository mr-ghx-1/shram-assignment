/**
 * Priority mapping utilities and types for task priority management
 */

export type PriorityKeyword = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

export interface PriorityLevel {
  value: number;
  keyword: PriorityKeyword;
  label: string;
  description: string;
  color: string;
}

export const PRIORITY_LEVELS: PriorityLevel[] = [
  {
    value: 1,
    keyword: 'low',
    label: 'Low',
    description: 'Nice-to-have, optional, can be done anytime',
    color: 'blue'
  },
  {
    value: 2,
    keyword: 'normal',
    label: 'Normal',
    description: 'Standard task with no urgency',
    color: 'neutral'
  },
  {
    value: 3,
    keyword: 'high',
    label: 'High',
    description: 'Should be completed soon, elevated importance',
    color: 'orange'
  },
  {
    value: 4,
    keyword: 'urgent',
    label: 'Urgent',
    description: 'Time-sensitive, needs attention shortly',
    color: 'red'
  },
  {
    value: 5,
    keyword: 'critical',
    label: 'Critical',
    description: 'Highest severity; blocking, must be addressed immediately',
    color: 'red-dark'
  }
];

/**
 * Keyword mappings for priority parsing
 */
const PRIORITY_KEYWORD_MAPPINGS: Array<{ keywords: string[]; value: number }> = [
  { keywords: ['low', 'minor', 'optional'], value: 1 },
  { keywords: ['normal', 'medium', 'standard', 'regular'], value: 2 },
  { keywords: ['high', 'important', 'elevated'], value: 3 },
  { keywords: ['urgent', 'pressing', 'time-sensitive'], value: 4 },
  { keywords: ['critical', 'severe', 'blocking', 'emergency'], value: 5 },
];

/**
 * Convert priority keyword or number to numeric value
 * @param input - Priority keyword (string) or numeric value (number)
 * @returns Numeric priority value (1-5) or null if invalid
 */
export function parsePriority(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) {
    return null;
  }

  // If already a number, validate and return
  if (typeof input === 'number') {
    return input >= 1 && input <= 5 ? input : null;
  }

  // Normalize input
  const normalized = input.toLowerCase().trim();

  // Check if it's a numeric string
  const numericValue = parseInt(normalized);
  if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 5) {
    return numericValue;
  }

  // Match against keywords
  for (const mapping of PRIORITY_KEYWORD_MAPPINGS) {
    if (mapping.keywords.some(keyword => normalized.includes(keyword))) {
      return mapping.value;
    }
  }

  return null;
}

/**
 * Convert priority value to keyword label
 * @param value - Numeric priority value (1-5)
 * @returns Priority keyword label (e.g., "High") or fallback string
 */
export function formatPriority(value: number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const level = PRIORITY_LEVELS.find(l => l.value === value);
  return level ? level.label : `Priority ${value}`;
}

/**
 * Get Tailwind color classes for priority display
 * @param priority - Numeric priority value (1-5)
 * @returns Tailwind color class string
 */
export function getPriorityColor(priority: number | null | undefined): string {
  if (priority === null || priority === undefined) {
    return 'text-neutral-600';
  }

  const colorMap: Record<number, string> = {
    1: 'text-blue-600',      // Low - calm blue
    2: 'text-neutral-600',   // Normal - neutral gray
    3: 'text-orange-600',    // High - attention orange
    4: 'text-red-600',       // Urgent - warning red
    5: 'text-red-700',       // Critical - strong red
  };

  return colorMap[priority] || 'text-neutral-600';
}
