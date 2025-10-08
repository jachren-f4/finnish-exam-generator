/**
 * Rate Limiter Service
 *
 * Implements in-memory rate limiting for API endpoints.
 * Tracks requests per user ID with hourly and daily limits.
 *
 * Configuration:
 * - Hourly limit: 10 exams per user
 * - Daily limit: 50 exams per user
 *
 * Note: In-memory storage means limits reset on server restart.
 * For persistent rate limiting across deploys, consider Redis.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds until reset
}

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

interface UserRateLimits {
  hourly: RateLimitEntry;
  daily: RateLimitEntry;
}

export type RateLimitType = 'hourly' | 'daily';

/**
 * Rate Limiter using in-memory storage
 */
export class RateLimiter {
  private limits: Map<string, UserRateLimits>;
  private readonly hourlyLimit: number;
  private readonly dailyLimit: number;
  private cleanupIntervalId?: NodeJS.Timeout;

  constructor(hourlyLimit: number = 10, dailyLimit: number = 50) {
    this.limits = new Map();
    this.hourlyLimit = hourlyLimit;
    this.dailyLimit = dailyLimit;

    // Start automatic cleanup of expired entries (every 5 minutes)
    this.startCleanup();
  }

  /**
   * Check if user has exceeded rate limit
   * @param userId User identifier (student_id or JWT sub)
   * @param limitType Type of limit to check (hourly or daily)
   * @returns Rate limit result with allowed status and metadata
   */
  async checkLimit(userId: string, limitType: RateLimitType = 'hourly'): Promise<RateLimitResult> {
    const now = new Date();

    // Get or create user limits
    let userLimits = this.limits.get(userId);
    if (!userLimits) {
      userLimits = this.createNewUserLimits(now);
      this.limits.set(userId, userLimits);
    }

    // Check if limits need reset
    this.resetExpiredLimits(userLimits, now);

    // Check the requested limit type
    const limit = limitType === 'hourly' ? userLimits.hourly : userLimits.daily;
    const maxLimit = limitType === 'hourly' ? this.hourlyLimit : this.dailyLimit;

    // Check if limit exceeded
    if (limit.count >= maxLimit) {
      const retryAfter = Math.ceil((limit.resetAt.getTime() - now.getTime()) / 1000);
      return {
        allowed: false,
        limit: maxLimit,
        remaining: 0,
        resetAt: limit.resetAt,
        retryAfter: Math.max(0, retryAfter)
      };
    }

    // Increment counter
    limit.count++;

    return {
      allowed: true,
      limit: maxLimit,
      remaining: maxLimit - limit.count,
      resetAt: limit.resetAt
    };
  }

  /**
   * Check both hourly and daily limits
   * Returns failure if either limit is exceeded
   */
  async checkAllLimits(userId: string): Promise<RateLimitResult> {
    // Check hourly limit first (more restrictive)
    const hourlyResult = await this.checkLimit(userId, 'hourly');
    if (!hourlyResult.allowed) {
      return hourlyResult;
    }

    // Check daily limit
    const dailyResult = await this.checkLimit(userId, 'daily');
    if (!dailyResult.allowed) {
      // Decrement hourly count since we're rejecting the request
      const userLimits = this.limits.get(userId);
      if (userLimits) {
        userLimits.hourly.count--;
      }
      return dailyResult;
    }

    // Return hourly result (more relevant for user)
    return hourlyResult;
  }

  /**
   * Get current usage for a user
   */
  async getUsage(userId: string): Promise<{ hourly: number; daily: number; hourlyLimit: number; dailyLimit: number }> {
    const userLimits = this.limits.get(userId);

    if (!userLimits) {
      return {
        hourly: 0,
        daily: 0,
        hourlyLimit: this.hourlyLimit,
        dailyLimit: this.dailyLimit
      };
    }

    const now = new Date();
    this.resetExpiredLimits(userLimits, now);

    return {
      hourly: userLimits.hourly.count,
      daily: userLimits.daily.count,
      hourlyLimit: this.hourlyLimit,
      dailyLimit: this.dailyLimit
    };
  }

  /**
   * Reset limits for a specific user (admin function)
   */
  async resetLimit(userId: string): Promise<void> {
    this.limits.delete(userId);
  }

  /**
   * Get all users with active rate limits (admin function)
   */
  async getAllUsage(): Promise<Array<{ userId: string; hourly: number; daily: number; hourlyResetAt: Date; dailyResetAt: Date }>> {
    const now = new Date();
    const results: Array<{ userId: string; hourly: number; daily: number; hourlyResetAt: Date; dailyResetAt: Date }> = [];

    for (const [userId, limits] of this.limits.entries()) {
      this.resetExpiredLimits(limits, now);

      // Only include users with active usage
      if (limits.hourly.count > 0 || limits.daily.count > 0) {
        results.push({
          userId,
          hourly: limits.hourly.count,
          daily: limits.daily.count,
          hourlyResetAt: limits.hourly.resetAt,
          dailyResetAt: limits.daily.resetAt
        });
      }
    }

    return results;
  }

  /**
   * Create new rate limit entries for a user
   */
  private createNewUserLimits(now: Date): UserRateLimits {
    return {
      hourly: {
        count: 0,
        resetAt: new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
      },
      daily: {
        count: 0,
        resetAt: this.getNextMidnight(now)
      }
    };
  }

  /**
   * Reset limits that have expired
   */
  private resetExpiredLimits(limits: UserRateLimits, now: Date): void {
    // Reset hourly limit if expired
    if (now >= limits.hourly.resetAt) {
      limits.hourly.count = 0;
      limits.hourly.resetAt = new Date(now.getTime() + 60 * 60 * 1000);
    }

    // Reset daily limit if expired
    if (now >= limits.daily.resetAt) {
      limits.daily.count = 0;
      limits.daily.resetAt = this.getNextMidnight(now);
    }
  }

  /**
   * Get next midnight (daily reset time)
   */
  private getNextMidnight(from: Date): Date {
    const midnight = new Date(from);
    midnight.setHours(24, 0, 0, 0);
    return midnight;
  }

  /**
   * Start automatic cleanup of expired entries
   * Runs every 5 minutes to prevent memory leaks
   */
  private startCleanup(): void {
    // Clean up every 5 minutes
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop automatic cleanup (for testing or shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
  }

  /**
   * Remove entries with no recent activity
   * Helps prevent memory leaks in long-running processes
   */
  private cleanup(): void {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    for (const [userId, limits] of this.limits.entries()) {
      // If both limits are at 0 and resets are in the past, remove entry
      if (
        limits.hourly.count === 0 &&
        limits.daily.count === 0 &&
        limits.hourly.resetAt < cutoff &&
        limits.daily.resetAt < cutoff
      ) {
        this.limits.delete(userId);
      }
    }

    console.log(`[RateLimiter] Cleanup completed. Active users: ${this.limits.size}`);
  }

  /**
   * Get total number of tracked users (for monitoring)
   */
  getTrackedUsersCount(): number {
    return this.limits.size;
  }
}

// Singleton instance for application-wide use
let rateLimiterInstance: RateLimiter | null = null;

/**
 * Get the singleton rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    // Get limits from environment or use defaults
    const hourlyLimit = parseInt(process.env.RATE_LIMIT_HOURLY || '10', 10);
    const dailyLimit = parseInt(process.env.RATE_LIMIT_DAILY || '50', 10);

    rateLimiterInstance = new RateLimiter(hourlyLimit, dailyLimit);
    console.log(`[RateLimiter] Initialized with limits: ${hourlyLimit}/hour, ${dailyLimit}/day`);
  }

  return rateLimiterInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetRateLimiter(): void {
  if (rateLimiterInstance) {
    rateLimiterInstance.stopCleanup();
    rateLimiterInstance = null;
  }
}
