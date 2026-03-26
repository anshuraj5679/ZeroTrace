const { isAddress } = require("ethers");
const { z } = require("zod");

const historyQuerySchema = z.object({
  wallet: z
    .string()
    .optional()
    .refine((value) => value === undefined || isAddress(value), "Invalid wallet"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1)
});

const rewardStatsQuerySchema = z.object({
  wallet: z.string().refine((value) => isAddress(value), "Invalid wallet")
});

module.exports = {
  historyQuerySchema,
  rewardStatsQuerySchema
};

