require("dotenv").config();

const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const ordersRouter = require("./routes/orders");
const tradesRouter = require("./routes/trades");
const rewardsRouter = require("./routes/rewards");
const statusRouter = require("./routes/status");
const { errorHandler } = require("./middleware/errorHandler");
const postgresService = require("./services/postgresService");
const redisService = require("./services/redisService");
const { startMatchingEngine } = require("./services/matchingEngine");

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/v1/order", ordersRouter);
app.use("/api/v1/trades", tradesRouter);
app.use("/api/v1/market", tradesRouter);
app.use("/api/v1/rewards", rewardsRouter);
app.use("/api/v1/status", statusRouter);

app.use(errorHandler);

async function bootstrap() {
  await redisService.connect();
  await postgresService.connect();
  startMatchingEngine();

  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => {
    console.log(`[ZeroTrace API] listening on ${port}`);
  });
}

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error("[ZeroTrace API] bootstrap failed", error);
    process.exit(1);
  });
}

module.exports = {
  app,
  bootstrap
};

