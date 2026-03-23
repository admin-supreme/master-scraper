import { Hono } from "hono";
import { log } from "./config/logger.js";
import { corsConfig } from "./config/cors.js";
import { ratelimit } from "./config/ratelimit.js";
import { DeploymentEnv, env, SERVERLESS_ENVIRONMENTS } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./config/errorHandler.js";
import type { ServerContext } from "./config/context.js";

import { logging } from "./middleware/logging.js";
import { cacheConfigSetter, cacheControlHeaders } from "./middleware/cache.js";
import { apiSignatureGuard } from "./middleware/apiSignature.js";

// Import routes
import { hianimeRouter } from "./routes/hianime/index.js";
import { hindiDubbedRouter } from "./routes/animehindidubbed/index.js";
import { watchawRouter } from "./routes/watchanimeworld/index.js";
import { animeyaRouter } from "./routes/animeya/index.js";
import { animeRouter } from "./routes/anime/index.js";
import { animeApiRouter } from "./routes/anime-api/index.js";
import { animelokRouter } from "./routes/animelok/index.js";
import desidubRouter from "./routes/desidubanime/index.js";
import { aniworldRouter } from "./routes/aniworld/index.js";
import { toonStreamRouter } from "./routes/toonstream/index.js";
import { hindiApiRouter } from "./routes/hindiapi/index.js";
import { anilistHindiRouter } from "./routes/anilisthindi/index.js";
import { toonWorldRouter } from "./routes/toonworld/index.js";
import { webhookRouter } from "./routes/webhooks/index.js";
import pkgJson from "../package.json" with { type: "json" };

// API version
const BASE_PATH = "/api/v1" as const;

const app = new Hono<ServerContext>();

// ========== MIDDLEWARE CHAIN ==========
app.use(logging);
app.use(corsConfig);
app.use(cacheControlHeaders);

// API signature verification (enabled when API_SECRET is set)
app.use(apiSignatureGuard);
const isPersonalDeployment = Boolean(env.API_HOSTNAME);
if (isPersonalDeployment) {
    app.use('*', async (c, next) => {
        const limiter = getRateLimiter();
        return limiter(c, next);
    });
}

// ========== HEALTH & INFO ENDPOINTS ==========
app.get("/health", (c) => c.text("daijoubu", { status: 200 }));

app.get("/version", (c) =>
    c.json({
        name: pkgJson.name,
        version: pkgJson.version,
        description: pkgJson.description,
    })
);

// ========== DYNAMIC DOCS ENDPOINT ==========
app.get(`${BASE_PATH}/docs/llm`, (c) => {
    return c.text("Docs UI is disabled in the Cloudflare Workers build.", 200);
});

app.get("/docs-content/:section", (c) => {
    return c.json({ error: "Docs are disabled in the Cloudflare Workers build" }, 404);
});

app.get("/docs/:section?", (c) => {
    return c.text("Docs UI is disabled in the Cloudflare Workers build.", 200);
});
// ========== CACHE CONFIG MIDDLEWARE ==========
app.use(cacheConfigSetter(BASE_PATH.length));

// ========== API ROUTES ==========
app.route(`${BASE_PATH}/hianime`, hianimeRouter);
app.route(`${BASE_PATH}/hindidubbed`, hindiDubbedRouter);
app.route(`${BASE_PATH}/watchaw`, watchawRouter);
app.route(`${BASE_PATH}/animeya`, animeyaRouter);
app.route(`${BASE_PATH}/anime`, animeRouter);
app.route(`${BASE_PATH}/anime-api`, animeApiRouter);
app.route(`${BASE_PATH}/animelok`, animelokRouter);
app.route(`${BASE_PATH}/desidubanime`, desidubRouter);
app.route(`${BASE_PATH}/aniworld`, aniworldRouter);
app.route(`${BASE_PATH}/toonstream`, toonStreamRouter);
app.route(`${BASE_PATH}/hindiapi`, hindiApiRouter);
app.route(`${BASE_PATH}/anilisthindi`, anilistHindiRouter);
app.route(`${BASE_PATH}/toonworld`, toonWorldRouter);
app.route(`${BASE_PATH}/webhooks`, webhookRouter);

// ========== ERROR HANDLING ==========
app.notFound(notFoundHandler);
app.onError(errorHandler);

export default app;
