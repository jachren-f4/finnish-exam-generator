/**
 * Cache Manager for improved performance
 * Provides in-memory caching with TTL, LRU eviction, and performance tracking
 */

import { PERFORMANCE_CONFIG } from '../config'

export interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
  size?: number
}

export interface CacheStats {
  totalEntries: number
  memoryUsage: number
  hitRate: number
  totalHits: number
  totalMisses: number
  averageAccessTime: number
}

export interface CacheConfig {
  maxEntries?: number
  defaultTtl?: number
  maxMemoryMB?: number
  enableMetrics?: boolean
}

/**
 * High-performance in-memory cache with LRU eviction
 */
export class CacheManager<T = any> {
  private cache = new Map<string, CacheEntry<T>>()
  private accessOrder = new Map<string, number>() // For LRU tracking
  private stats = {
    hits: 0,
    misses: 0,
    accessTimes: [] as number[]
  }
  
  private maxEntries: number
  private defaultTtl: number
  private maxMemoryBytes: number
  private enableMetrics: boolean
  private accessCounter = 0

  constructor(config: CacheConfig = {}) {
    this.maxEntries = config.maxEntries || 1000
    this.defaultTtl = config.defaultTtl || 300000 // 5 minutes
    this.maxMemoryBytes = (config.maxMemoryMB || 100) * 1024 * 1024 // 100MB
    this.enableMetrics = config.enableMetrics !== false
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000)
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const startTime = this.enableMetrics ? Date.now() : 0
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      this.recordAccessTime(startTime)
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.accessOrder.delete(key)
      this.stats.misses++
      this.recordAccessTime(startTime)
      return null
    }

    // Update access tracking
    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.accessOrder.set(key, ++this.accessCounter)
    
    this.stats.hits++
    this.recordAccessTime(startTime)
    
    if (PERFORMANCE_CONFIG.TIMING_ENABLED) {
      console.log(`💾 [CACHE] HIT: ${key}`)
    }
    
    return entry.value
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const actualTtl = ttl || this.defaultTtl
    const size = this.calculateSize(value)
    
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: actualTtl,
      accessCount: 1,
      lastAccessed: Date.now(),
      size
    }

    // Check if we need to make space
    this.ensureCapacity()
    
    this.cache.set(key, entry)
    this.accessOrder.set(key, ++this.accessCounter)
    
    if (PERFORMANCE_CONFIG.TIMING_ENABLED) {
      console.log(`💾 [CACHE] SET: ${key} (TTL: ${actualTtl}ms, Size: ${size} bytes)`)
    }
  }

  /**
   * Get or set pattern - common caching pattern
   */
  async getOrSet<U extends T>(
    key: string, 
    factory: () => Promise<U>, 
    ttl?: number
  ): Promise<U> {
    const cached = this.get(key) as U
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    this.set(key, value, ttl)
    return value
  }

  /**
   * Delete from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    this.accessOrder.delete(key)
    
    if (deleted && PERFORMANCE_CONFIG.TIMING_ENABLED) {
      console.log(`💾 [CACHE] DELETE: ${key}`)
    }
    
    return deleted
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.accessOrder.delete(key)
      return false
    }
    
    return true
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.accessOrder.clear()
    this.stats.hits = 0
    this.stats.misses = 0
    this.stats.accessTimes = []
    this.accessCounter = 0
    
    if (PERFORMANCE_CONFIG.TIMING_ENABLED) {
      console.log(`💾 [CACHE] CLEARED`)
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalAccesses = this.stats.hits + this.stats.misses
    const hitRate = totalAccesses > 0 ? (this.stats.hits / totalAccesses) * 100 : 0
    const averageAccessTime = this.stats.accessTimes.length > 0
      ? this.stats.accessTimes.reduce((a, b) => a + b, 0) / this.stats.accessTimes.length
      : 0

    return {
      totalEntries: this.cache.size,
      memoryUsage: this.getMemoryUsage(),
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      averageAccessTime: Math.round(averageAccessTime * 1000) / 1000
    }
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get cache entry info without accessing the value
   */
  getEntryInfo(key: string): Omit<CacheEntry<T>, 'value'> | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    const { value, ...info } = entry
    return info
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const expiredKeys = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key)
      }
    }
    
    expiredKeys.forEach(key => {
      this.cache.delete(key)
      this.accessOrder.delete(key)
    })
    
    if (expiredKeys.length > 0 && PERFORMANCE_CONFIG.TIMING_ENABLED) {
      console.log(`💾 [CACHE] CLEANUP: Removed ${expiredKeys.length} expired entries`)
    }
  }

  /**
   * Ensure cache doesn't exceed capacity limits
   */
  private ensureCapacity(): void {
    // Check entry count limit
    while (this.cache.size >= this.maxEntries) {
      this.evictLRU()
    }
    
    // Check memory limit
    while (this.getMemoryUsage() > this.maxMemoryBytes) {
      this.evictLRU()
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null
    let lruAccess = Infinity
    
    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < lruAccess) {
        lruAccess = accessTime
        lruKey = key
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey)
      this.accessOrder.delete(lruKey)
      
      if (PERFORMANCE_CONFIG.TIMING_ENABLED) {
        console.log(`💾 [CACHE] LRU EVICTION: ${lruKey}`)
      }
    }
  }

  /**
   * Calculate approximate size of cached value
   */
  private calculateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2 // Rough estimate (UTF-16)
    } catch {
      return 1000 // Fallback estimate
    }
  }

  /**
   * Get approximate memory usage
   */
  private getMemoryUsage(): number {
    let total = 0
    for (const entry of this.cache.values()) {
      total += entry.size || 1000
    }
    return total
  }

  /**
   * Record access time for performance metrics
   */
  private recordAccessTime(startTime: number): void {
    if (!this.enableMetrics || startTime === 0) return
    
    const accessTime = Date.now() - startTime
    this.stats.accessTimes.push(accessTime)
    
    // Keep only last 1000 access times
    if (this.stats.accessTimes.length > 1000) {
      this.stats.accessTimes = this.stats.accessTimes.slice(-1000)
    }
  }
}

/**
 * Specialized cache for exam data
 */
export class ExamCache extends CacheManager {
  constructor() {
    super({
      maxEntries: 500,
      defaultTtl: 600000, // 10 minutes
      maxMemoryMB: 50
    })
  }

  /**
   * Cache exam data with specific TTL based on status
   */
  setExam(examId: string, examData: any): void {
    // Different TTL based on exam status
    const ttl = examData.status === 'created' ? 300000 : 1800000 // 5min for active, 30min for completed
    this.set(`exam:${examId}`, examData, ttl)
  }

  getExam(examId: string): any | null {
    return this.get(`exam:${examId}`)
  }
}

/**
 * Specialized cache for grading results
 */
export class GradingCache extends CacheManager {
  constructor() {
    super({
      maxEntries: 200,
      defaultTtl: 3600000, // 1 hour (grading results rarely change)
      maxMemoryMB: 30
    })
  }

  setGrading(examId: string, gradingData: any): void {
    this.set(`grading:${examId}`, gradingData, 3600000) // 1 hour
  }

  getGrading(examId: string): any | null {
    return this.get(`grading:${examId}`)
  }
}

/**
 * Specialized cache for API responses
 */
export class ApiResponseCache extends CacheManager {
  constructor() {
    super({
      maxEntries: 1000,
      defaultTtl: 300000, // 5 minutes
      maxMemoryMB: 100
    })
  }

  /**
   * Cache API response with request signature as key
   */
  cacheResponse(method: string, endpoint: string, params: any, response: any, ttl?: number): void {
    const key = this.generateCacheKey(method, endpoint, params)
    this.set(key, response, ttl)
  }

  getCachedResponse(method: string, endpoint: string, params: any): any | null {
    const key = this.generateCacheKey(method, endpoint, params)
    return this.get(key)
  }

  private generateCacheKey(method: string, endpoint: string, params: any): string {
    const paramString = JSON.stringify(params)
    return `api:${method}:${endpoint}:${Buffer.from(paramString).toString('base64')}`
  }
}

// Global cache instances
export const examCache = new ExamCache()
export const gradingCache = new GradingCache()
export const apiResponseCache = new ApiResponseCache()
export const globalCache = new CacheManager({
  maxEntries: 1000,
  defaultTtl: 600000, // 10 minutes
  maxMemoryMB: 200
})

/**
 * Cache middleware for wrapping functions
 */
export function withCache<Args extends any[], Return>(
  fn: (...args: Args) => Promise<Return>,
  keyGenerator: (...args: Args) => string,
  cache: CacheManager = globalCache,
  ttl?: number
): (...args: Args) => Promise<Return> {
  return async (...args: Args): Promise<Return> => {
    const key = keyGenerator(...args)
    
    return cache.getOrSet(key, () => fn(...args), ttl)
  }
}