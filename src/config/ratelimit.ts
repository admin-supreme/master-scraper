import { rateLimiter } from "hono-rate-limiter";
import { env } from "./env.js";

export const ratelimit = rateLimiter({
    standardHeaders: "draft-7",
    limit: env.RATE_LIMIT_MAX_REQUESTS,
    windowMs: env.RATE_LIMIT_WINDOW_MS,

    keyGenerator(c) {
        const cid = c.req.header("x-client-id");
        if (cid && cid.length >= 10) {
            return `cid_${cid}`;
        }

        return (
            c.req.header("cf-connecting-ip") ||
            c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
            c.req.header("x-real-ip") ||
            "unknown"
        );
    },

    handler(c) {
        return c.json(
            {
                status: 429,
                message: "Too Many Requests. Please slow down! 🐌",
                retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000),
            },
            { status: 429 }
        );
    },
});