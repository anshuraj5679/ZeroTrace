const express = require("express");
const postgresService = require("../services/postgresService");
const redisService = require("../services/redisService");
const webhookService = require("../services/webhookService");
const { webhookRegistrationSchema } = require("../models/order");
const { sendSuccess } = require("../utils/response");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    let pgOk = false;
    let redisOk = false;

    try { await postgresService.healthCheck(); pgOk = true; } catch (_) {}
    try { await redisService.getActiveOrdersCount(); redisOk = true; } catch (_) {}

    return sendSuccess(res, {
      status: pgOk && redisOk ? "ok" : "degraded",
      postgres: pgOk ? "connected" : "unavailable",
      redis: redisOk ? "connected" : "unavailable",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

router.post("/webhooks/register", async (req, res, next) => {
  try {
    const payload = webhookRegistrationSchema.parse(req.body);
    const webhook = await webhookService.register(payload.url, payload.events);
    return sendSuccess(res, webhook, 201);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

