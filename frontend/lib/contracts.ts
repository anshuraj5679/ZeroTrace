export const cofheInputComponents = [
  { name: "ctHash", type: "uint256" },
  { name: "securityZone", type: "uint8" },
  { name: "utype", type: "uint8" },
  { name: "signature", type: "bytes" }
] as const;

export const privateTokenAbi = [
  {
    type: "function",
    name: "approveEncrypted",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "encryptedAmount", type: "tuple", components: cofheInputComponents }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "mintEncrypted",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "encryptedAmount", type: "tuple", components: cofheInputComponents }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "balanceOfEncrypted",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }]
  }
] as const;

export const zeroTraceAbi = [
  {
    type: "function",
    name: "submitOrder",
    stateMutability: "nonpayable",
    inputs: [
      { name: "orderId", type: "bytes32" },
      { name: "tokenBase", type: "address" },
      { name: "tokenQuote", type: "address" },
      { name: "encryptedBaseAmount", type: "tuple", components: cofheInputComponents },
      { name: "encryptedLimitPrice", type: "tuple", components: cofheInputComponents },
      { name: "isBuy", type: "bool" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "cancelOrder",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "bytes32" }],
    outputs: []
  },
  {
    type: "function",
    name: "getOrderCiphertexts",
    stateMutability: "view",
    inputs: [{ name: "orderId", type: "bytes32" }],
    outputs: [
      { name: "remainingBase", type: "bytes32" },
      { name: "limitPrice", type: "bytes32" },
      { name: "reservedQuote", type: "bytes32" }
    ]
  }
] as const;
