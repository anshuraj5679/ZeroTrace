const express = require("express");
const postgresService = require("../services/postgresService");
const redisService = require("../services/redisService");
const webhookService = require("../services/webhookService");
const { webhookRegistrationSchema } = require("../models/order");
const { sendSuccess } = require("../utils/response");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    await postgresService.healthCheck();
    await redisService.getActiveOrdersCount();

    return sendSuccess(res, {
      status: "ok",
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

