import { DeploymentEnv, env } from "./env.js";
import { LRUCache } from "lru-cache";
import { log } from "./logger.js";

export class TatakaCache {
    private static instance: TatakaCache | null = null;

    private memoryCache: LRUCache<string, string>;
    public redisEnabled: boolean = false;

    static DEFAULT_TTL_SECONDS = env.CACHE_TTL_SECONDS;

    constructor() {
        this.memoryCache = new LRUCache<string, string>({
            max: 1000,
            ttl: TatakaCache.DEFAULT_TTL_SECONDS * 1000,
            updateAgeOnGet: true,
        });

        log.info(
            env.DEPLOYMENT_ENV === DeploymentEnv.CLOUDFLARE_WORKERS
                ? "Cloudflare Workers detected. Using in-memory cache only."
                : "Using in-memory cache."
        );
    }

    static getInstance(): TatakaCache {
        if (!TatakaCache.instance) {
            TatakaCache.instance = new TatakaCache();
        }
        return TatakaCache.instance;
    }

    async getOrSet<T>(
        dataGetter: () => Promise<T>,
        key: string,
        ttlSeconds: number = TatakaCache.DEFAULT_TTL_SECONDS
    ): Promise<T> {
        const cachedData = this.memoryCache.get(key) || null;

        if (cachedData) {
            try {
                return JSON.parse(cachedData) as T;
            } catch {
                // ignore bad cache and refetch
            }
        }

        const data = await dataGetter();
        const serialized = JSON.stringify(data);

        this.memoryCache.set(key, serialized, {
            ttl: ttlSeconds * 1000,
        });

        return data;
    }

    async invalidate(key: string): Promise<void> {
        this.memoryCache.delete(key);
    }

    async invalidatePattern(pattern: string): Promise<void> {
        if (pattern === "*") {
            this.memoryCache.clear();
        }
    }

    async close(): Promise<void> {
        TatakaCache.instance = null;
    }
}

export const cache = TatakaCache.getInstance();