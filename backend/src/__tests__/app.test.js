const { Wallet } = require("ethers");
const request = require("supertest");

jest.mock("../services/postgresService", () => ({
  connect: jest.fn(),
  healthCheck: jest.fn(),
  query: jest.fn()
}));

jest.mock("../services/redisService", () => ({
  addToPendingSet: jest.fn(),
  addWalletOrder: jest.fn(),
  connect: jest.fn(),
  getActiveOrdersCount: jest.fn(),
  getOrder: jest.fn(),
  getWalletOrders: jest.fn(),
  removeFromPendingSet: jest.fn(),
  setOrder: jest.fn()
}));

jest.mock("../services/webhookService", () => ({
  register: jest.fn()
}));

jest.mock("../services/rewardsService", () => ({
  getLeaderboard: jest.fn(),
  getUserStats: jest.fn()
}));

jest.mock("../services/web3Service", () => ({
  executeMatch: jest.fn(),
  getOrder: jest.fn(),
  getOrderCiphertexts: jest.fn()
}));

jest.mock("../services/matchingEngine", () => ({
  startMatchingEngine: jest.fn()
}));

jest.mock("../utils/crypto", () => ({
  decryptPayload: jest.fn(),
  encryptPayload: jest.fn()
}));

const postgresService = require("../services/postgresService");
const redisService = require("../services/redisService");
const rewardsService = require("../services/rewardsService");
const web3Service = require("../services/web3Service");
const webhookService = require("../services/webhookService");
const { buildAuthMessage } = require("../middleware/auth");
const { decryptPayload, encryptPayload } = require("../utils/crypto");
const { app } = require("../server");

describe("ZeroTrace API routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a healthy status payload", async () => {
    postgresService.healthCheck.mockResolvedValue(true);
    redisService.getActiveOrdersCount.mockResolvedValue(9);

    const response = await request(app).get("/api/v1/status");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        status: "ok",
        postgres: "connected",
        redis: "connected",
        timestamp: expect.any(String)
      }
    });
    expect(postgresService.healthCheck).toHaveBeenCalledTimes(1);
    expect(redisService.getActiveOrdersCount).toHaveBeenCalledTimes(1);
  });

  it("returns degraded status when a dependency is unavailable", async () => {
    postgresService.healthCheck.mockRejectedValue(new Error("database unavailable"));
    redisService.getActiveOrdersCount.mockResolvedValue(9);

    const response = await request(app).get("/api/v1/status");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        status: "degraded",
        postgres: "unavailable",
        redis: "connected",
        timestamp: expect.any(String)
      }
    });
  });

  it("registers webhooks through the status router", async () => {
    const webhook = {
      id: "webhook-1",
      url: "https://example.com/webhooks/zerotrace",
      events: ["trade.executed"],
      active: true,
      created_at: "2026-04-08T00:00:00.000Z"
    };
    webhookService.register.mockResolvedValue(webhook);

    const response = await request(app)
      .post("/api/v1/status/webhooks/register")
      .send({
        url: webhook.url,
        events: webhook.events
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      data: webhook
    });
    expect(webhookService.register).toHaveBeenCalledWith(webhook.url, webhook.events);
  });

  it("sanitizes stored orders in the status endpoint", async () => {
    redisService.getOrder.mockResolvedValue("encrypted-payload");
    web3Service.getOrderCiphertexts.mockResolvedValue({
      remainingBase: "0x000000000000000000000000000000000000000000000000000000000000007b",
      limitPrice: "0x00000000000000000000000000000000000000000000000000000000000001c8",
      reservedQuote: "0x0000000000000000000000000000000000000000000000000000000000000000"
    });
    decryptPayload.mockReturnValue({
      orderId: "order-1",
      status: "pending",
      tokenBase: "0x00000000000000000000000000000000000000aa",
      tokenQuote: "0x00000000000000000000000000000000000000bb",
      pair: "ZETH/ZUSDC",
      isBuy: true,
      timestamp: "2026-04-08T00:00:00.000Z",
      txHash: "0xabc123",
      baseTokenDecimals: 18,
      quoteTokenDecimals: 6
    });

    const response = await request(app).get("/api/v1/order/status/order-1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        orderId: "order-1",
        status: "pending",
        tokenIn: "0x00000000000000000000000000000000000000aa",
        tokenOut: "0x00000000000000000000000000000000000000bb",
        pair: "ZETH/ZUSDC",
        amount: null,
        isBuy: true,
        timestamp: "2026-04-08T00:00:00.000Z",
        txHash: "0xabc123",
        remainingBaseHandle: "0x000000000000000000000000000000000000000000000000000000000000007b",
        limitPriceHandle: "0x00000000000000000000000000000000000000000000000000000000000001c8",
        baseTokenDecimals: 18,
        quoteTokenDecimals: 6
      }
    });
  });

  it("indexes only metadata for submitted orders", async () => {
    const wallet = Wallet.createRandom();
    const nonce = "n-1";
    const timestamp = Date.now();
    const signature = await wallet.signMessage(buildAuthMessage(nonce, timestamp));
    const tokenBase = "0x00000000000000000000000000000000000000aa";
    const tokenQuote = "0x00000000000000000000000000000000000000bb";

    web3Service.getOrder.mockResolvedValue({
      trader: wallet.address.toLowerCase(),
      tokenBase,
      tokenQuote,
      isBuy: true,
      cancelled: false,
      closed: false,
      baseTokenDecimals: 18,
      timestamp: Math.floor(timestamp / 1000)
    });
    encryptPayload.mockImplementation((value) => JSON.stringify(value));

    const response = await request(app)
      .post("/api/v1/order/submit")
      .send({
        walletAddress: wallet.address,
        orderId: "0x1111111111111111111111111111111111111111111111111111111111111111",
        txHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
        tokenBase,
        tokenQuote,
        isBuy: true,
        signature,
        nonce,
        timestamp
      });

    expect(response.status).toBe(201);
    expect(encryptPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "0x1111111111111111111111111111111111111111111111111111111111111111",
        tokenBase,
        tokenQuote,
        isBuy: true,
        status: "pending"
      })
    );

    const persistedOrder = encryptPayload.mock.calls[0][0];
    expect(persistedOrder).not.toHaveProperty("baseAmountRaw");
    expect(persistedOrder).not.toHaveProperty("remainingBaseRaw");
    expect(persistedOrder).not.toHaveProperty("limitPriceRaw");
    expect(persistedOrder).not.toHaveProperty("reservedQuoteRaw");
  });

  it("returns an anonymized leaderboard", async () => {
    rewardsService.getLeaderboard.mockResolvedValue([
      {
        wallet: "0x1111111111111111111111111111111111111111",
        points: "4200",
        volume_usd: "125000.5",
        tier: "Gold"
      }
    ]);

    const response = await request(app).get("/api/v1/rewards/leaderboard");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        {
          rank: 1,
          wallet: "0x1111...1111",
          points: 4200,
          volume: 125000.5,
          tier: "Gold"
        }
      ]
    });
  });
});
