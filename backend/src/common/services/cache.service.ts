import { Injectable, Logger, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Cache del error for key ${key}:`, error);
    }
  }

  async reset(): Promise<void> {
    try {
      // cache-manager v5+ doesn't have reset()
      // This is a no-op - individual keys should be deleted with del()
      this.logger.warn(
        "Cache reset() is not available in cache-manager v5+. Use del() for individual keys.",
      );
    } catch (error) {
      this.logger.error("Cache reset error:", error);
    }
  }

  generateKey(prefix: string, ...parts: (string | number | undefined)[]): string {
    const filtered = parts.filter((p) => p !== undefined && p !== null);

    return `${prefix}:${filtered.join(":")}`;
  }
}
