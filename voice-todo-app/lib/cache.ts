/**
 * Simple in-memory cache with TTL for API route optimization
 * Reduces database queries for frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<unknown>>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Get a value from cache if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set a value in cache with TTL in milliseconds
   */
  set<T>(key: string, data: T, ttl: number = 5000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidate(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const apiCache = new SimpleCache();

/**
 * Generate cache key for task queries
 */
export function generateTasksCacheKey(filter?: {
  query?: string;
  priority?: number;
  scheduled?: string;
  completed?: boolean;
  tags?: string[];
}): string {
  if (!filter) {
    return 'tasks:all';
  }

  const parts = ['tasks'];
  
  if (filter.query) {
    parts.push(`q:${filter.query}`);
  }
  
  if (filter.priority !== undefined) {
    parts.push(`p:${filter.priority}`);
  }
  
  if (filter.scheduled) {
    parts.push(`s:${filter.scheduled}`);
  }
  
  if (filter.completed !== undefined) {
    parts.push(`c:${filter.completed}`);
  }
  
  if (filter.tags && filter.tags.length > 0) {
    parts.push(`t:${filter.tags.sort().join(',')}`);
  }

  return parts.join(':');
}
