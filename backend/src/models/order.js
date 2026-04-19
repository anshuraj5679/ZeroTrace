const { isAddress } = require("ethers");
const { z } = require("zod");

const addressSchema = z.string().refine((value) => isAddress(value), {
  message: "Invalid address"
});

const hash32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/);

const authFieldsSchema = {
  walletAddress: addressSchema,
  signature: z.string().min(1),
  nonce: z.string().min(1),
  timestamp: z.union([z.number(), z.string()]).transform((value) => Number(value))
};

const submitOrderSchema = z.object({
  ...authFieldsSchema,
  orderId: hash32Schema,
  txHash: hash32Schema,
  tokenBase: addressSchema,
  tokenQuote: addressSchema,
  isBuy: z.boolean(),
  baseAmountRaw: z.string().optional(),
  limitPriceRaw: z.string().optional()
});

const cancelOrderSchema = z.object({
  ...authFieldsSchema,
  orderId: hash32Schema,
  txHash: hash32Schema
});

const walletQuerySchema = z.object({
  wallet: addressSchema
});

const webhookRegistrationSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1)
});

module.exports = {
  cancelOrderSchema,
  submitOrderSchema,
  walletQuerySchema,
  webhookRegistrationSchema
};
