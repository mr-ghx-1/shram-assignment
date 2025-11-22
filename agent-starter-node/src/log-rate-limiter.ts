/**
 * Log Rate Limiter
 * 
 * Implements a token bucket algorithm to prevent Railway log rate limit violations.
 * Railway has a limit of 500 logs/sec, so we target 400 logs/sec for safety margin.
 * 
 * Features:
 * - Token bucket rate limiting
 * - Priority-based log filtering (ERROR > WARN > INFO > DEBUG)
 * - Message aggregation for repetitive logs
 * - Dropped log tracking and periodic reporting
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  args: any[];
  timestamp: number;
}

interface AggregatedMessage {
  count: number;
  firstSeen: number;
  lastSeen: number;
  level: LogLevel;
}

class LogRateLimiter {
  private readonly maxLogsPerSecond: number;
  private readonly bucketSize: number;
  private tokens: number;
  private lastRefillTime: number;
  
  // Dropped log tracking
  private droppedCount: number = 0;
  private droppedByLevel: Map<LogLevel, number> = new Map();
  private lastDroppedReportTime: number = Date.now();
  private readonly droppedReportIntervalMs: number = 60000; // 60 seconds
  
  // Message aggregation
  private messageAggregation: Map<string, AggregatedMessage> = new Map();
  private readonly aggregationWindowMs: number = 60000; // 60 seconds
  private lastAggregationCleanup: number = Date.now();
  
  // Patterns for messages that should be aggregated
  private readonly aggregationPatterns: RegExp[] = [
    /process memory usage/i,
    /connection event/i,
    /participant (connected|disconnected)/i,
    /health check/i,
  ];

  constructor(maxLogsPerSecond: number = 400) {
    this.maxLogsPerSecond = maxLogsPerSecond;
    this.bucketSize = maxLogsPerSecond; // Bucket can hold 1 second worth of logs
    this.tokens = this.bucketSize; // Start with full bucket
    this.lastRefillTime = Date.now();
    
    // Initialize dropped count map
    this.droppedByLevel.set(LogLevel.ERROR, 0);
    this.droppedByLevel.set(LogLevel.WARN, 0);
    this.droppedByLevel.set(LogLevel.INFO, 0);
    this.droppedByLevel.set(LogLevel.DEBUG, 0);
    
    // Start periodic reporting of dropped logs
    this.startDroppedLogReporting();
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefillTime;
    const elapsedSeconds = elapsedMs / 1000;
    
    // Add tokens based on elapsed time
    const tokensToAdd = elapsedSeconds * this.maxLogsPerSecond;
    this.tokens = Math.min(this.bucketSize, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * Check if a log should be aggregated
   */
  private shouldAggregate(message: string): boolean {
    return this.aggregationPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Get aggregation key for a message
   */
  private getAggregationKey(message: string): string {
    // Normalize message by removing numbers and timestamps
    return message
      .replace(/\d+/g, 'N')
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, 'TIMESTAMP')
      .substring(0, 100); // Limit key length
  }

  /**
   * Aggregate a message instead of logging it immediately
   */
  private aggregateMessage(level: LogLevel, message: string): void {
    const key = this.getAggregationKey(message);
    const now = Date.now();
    
    const existing = this.messageAggregation.get(key);
    if (existing) {
      existing.count++;
      existing.lastSeen = now;
    } else {
      this.messageAggregation.set(key, {
        count: 1,
        firstSeen: now,
        lastSeen: now,
        level,
      });
    }
  }

  /**
   * Flush aggregated messages that are ready to be logged
   */
  private flushAggregatedMessages(): void {
    const now = Date.now();
    
    // Only cleanup periodically
    if (now - this.lastAggregationCleanup < this.aggregationWindowMs) {
      return;
    }
    
    this.lastAggregationCleanup = now;
    
    // Log aggregated messages
    for (const [key, data] of this.messageAggregation.entries()) {
      if (data.count > 1) {
        const levelName = LogLevel[data.level];
        console.log(`[AGGREGATED ${levelName}] Message occurred ${data.count} times in last ${this.aggregationWindowMs / 1000}s: ${key}`);
      }
    }
    
    // Clear aggregation map
    this.messageAggregation.clear();
  }

  /**
   * Check if a log should be allowed based on rate limit and priority
   */
  private shouldLog(level: LogLevel): boolean {
    this.refillTokens();
    
    // Always allow ERROR logs (highest priority)
    if (level === LogLevel.ERROR) {
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return true;
      }
      // Even if no tokens, allow errors but track as dropped for other levels
      return true;
    }
    
    // For other levels, check if we have tokens
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    // No tokens available, drop the log
    this.droppedCount++;
    const currentCount = this.droppedByLevel.get(level) || 0;
    this.droppedByLevel.set(level, currentCount + 1);
    
    return false;
  }

  /**
   * Log a message with rate limiting
   */
  public log(level: LogLevel, message: string, ...args: any[]): void {
    // Check if message should be aggregated
    if (this.shouldAggregate(message)) {
      this.aggregateMessage(level, message);
      return;
    }
    
    // Check if we should log based on rate limit
    if (!this.shouldLog(level)) {
      return;
    }
    
    // Log the message
    const levelName = LogLevel[level];
    const prefix = `[${levelName}]`;
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(prefix, message, ...args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, ...args);
        break;
      case LogLevel.INFO:
        console.info(prefix, message, ...args);
        break;
      case LogLevel.DEBUG:
        console.log(prefix, message, ...args);
        break;
    }
  }

  /**
   * Get the number of dropped logs since last reset
   */
  public getDroppedCount(): number {
    return this.droppedCount;
  }

  /**
   * Get dropped count by level
   */
  public getDroppedByLevel(): Map<LogLevel, number> {
    return new Map(this.droppedByLevel);
  }

  /**
   * Reset dropped log counter
   */
  public resetDroppedCount(): void {
    this.droppedCount = 0;
    this.droppedByLevel.set(LogLevel.ERROR, 0);
    this.droppedByLevel.set(LogLevel.WARN, 0);
    this.droppedByLevel.set(LogLevel.INFO, 0);
    this.droppedByLevel.set(LogLevel.DEBUG, 0);
  }

  /**
   * Start periodic reporting of dropped logs
   */
  private startDroppedLogReporting(): void {
    setInterval(() => {
      this.flushAggregatedMessages();
      
      const now = Date.now();
      if (now - this.lastDroppedReportTime >= this.droppedReportIntervalMs) {
        if (this.droppedCount > 0) {
          const breakdown = Array.from(this.droppedByLevel.entries())
            .filter(([_, count]) => count > 0)
            .map(([level, count]) => `${LogLevel[level]}: ${count}`)
            .join(', ');
          
          console.warn(
            `[RATE LIMITER] Dropped ${this.droppedCount} logs in last ${this.droppedReportIntervalMs / 1000}s (${breakdown})`
          );
          
          this.resetDroppedCount();
        }
        this.lastDroppedReportTime = now;
      }
    }, this.droppedReportIntervalMs);
  }

  /**
   * Convenience methods for each log level
   */
  public error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }
}

// Export singleton instance
const logRateLimit = parseInt(process.env.LOG_RATE_LIMIT || '400', 10);
export const logger = new LogRateLimiter(logRateLimit);

// Export class for testing
export { LogRateLimiter };
