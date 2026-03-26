export type TokenConfig = {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
};

export type PairConfig = {
  id: string;
  base: TokenConfig;
  quote: TokenConfig;
};

const zeth = (process.env.NEXT_PUBLIC_ZETH_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
const zusdc = (process.env.NEXT_PUBLIC_ZUSDC_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const tokenCatalog = {
  ZETH: {
    address: zeth,
    symbol: "ZETH",
    decimals: 18
  },
  ZUSDC: {
    address: zusdc,
    symbol: "ZUSDC",
    decimals: 6
  }
} satisfies Record<string, TokenConfig>;

export const tradingPairs: PairConfig[] = [
  {
    id: "zeth-zusdc",
    base: tokenCatalog.ZETH,
    quote: tokenCatalog.ZUSDC
  }
];

