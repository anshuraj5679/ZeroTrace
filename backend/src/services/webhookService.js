const axios = require("axios");
const postgresService = require("./postgresService");

async function register(url, events) {
  const result = await postgresService.query(
    `
      INSERT INTO webhooks (url, events, active)
      VALUES ($1, $2, TRUE)
      RETURNING id, url, events, active, created_at
    `,
    [url, events]
  );

  return result.rows[0];
}

async function fire(event, data) {
  const result = await postgresService.query(
    `
      SELECT id, url, events
      FROM webhooks
      WHERE active = TRUE AND $1 = ANY(events)
    `,
    [event]
  );

  for (const webhook of result.rows) {
    try {
      await axios.post(webhook.url, { event, data }, { timeout: 5000 });
    } catch (_firstError) {
      try {
        await axios.post(webhook.url, { event, data }, { timeout: 5000 });
      } catch (secondError) {
        console.error("[Webhook]", webhook.id, secondError.message);
      }
    }
  }
}

module.exports = {
  fire,
  register
};
