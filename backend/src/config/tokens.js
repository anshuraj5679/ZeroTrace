const { getAddress, isAddress } = require("ethers");

function normalize(address) {
  if (!address || !isAddress(address)) {
    return null;
  }

  return getAddress(address).toLowerCase();
}

function getTokenCatalog() {
  return [
    {
      symbol: "ZUSDC",
      name: "ZeroTrace USD Coin",
      decimals: 6,
      address: normalize(process.env.ZUSDC_ADDRESS)
    },
    {
      symbol: "ZETH",
      name: "ZeroTrace Ether",
      decimals: 18,
      address: normalize(process.env.ZETH_ADDRESS)
    }
  ].filter((token) => token.address);
}

function resolveToken(address) {
  const normalized = normalize(address);
  const match = getTokenCatalog().find((token) => token.address === normalized);

  if (match) {
    return match;
  }

  return {
    symbol: normalized ? `${normalized.slice(0, 6)}...${normalized.slice(-4)}` : "UNKNOWN",
    name: "Unknown Token",
    decimals: 18,
    address: normalized
  };
}

function toPairLabel(tokenIn, tokenOut) {
  return `${resolveToken(tokenIn).symbol}/${resolveToken(tokenOut).symbol}`;
}

function getTokenDecimals(address) {
  return resolveToken(address).decimals;
}

module.exports = {
  getTokenCatalog,
  getTokenDecimals,
  resolveToken,
  toPairLabel
};
