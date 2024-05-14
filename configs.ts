import { Token } from "@uniswap/sdk-core";
import { ethers, JsonRpcProvider, FallbackProvider } from "ethers";
import dotenv from "dotenv";
dotenv.config();

export enum CHAINS {
  MAINNET = 1,
  BASE = 8453,
}

const RPC_SERVERS = {
  [CHAINS.MAINNET]: [
    "https://ethereum-rpc.publicnode.com",
    "https://1rpc.io/eth",
    "https://rpc.mevblocker.io",
    "https://eth-pokt.nodies.app",
    "https://eth.llamarpc.com",
    "https://eth.drpc.org",
  ],
  [CHAINS.BASE]: [
    "https://base.drpc.org",
    "https://base-rpc.publicnode.com",
    "https://1rpc.io/base",
    "https://base.meowrpc.com",
    "https://base.llamarpc.com",
    "https://base-pokt.nodies.app",
  ],
};

function getProviderConfig(rpc: string, priority: number) {
  return {
    provider: new JsonRpcProvider(rpc),
    priority: priority,
    weight: 1,
    stallTimeout: 1000, // 1s
  };
}
const quorum = 1;

export const PROVIDERS = {
  [CHAINS.MAINNET]: new FallbackProvider(
    RPC_SERVERS[CHAINS.MAINNET].map((rpc, i) => getProviderConfig(rpc, i)),
    undefined,
    { quorum }
  ),
  [CHAINS.BASE]: new FallbackProvider(
    RPC_SERVERS[CHAINS.BASE].map((rpc, i) => getProviderConfig(rpc, i)),
    undefined,
    { quorum }
  ),
};

export const WALLETS = {
  [CHAINS.MAINNET]: new ethers.Wallet(
    process.env.BOT_P_KEY!,
    PROVIDERS[CHAINS.MAINNET]
  ),
  [CHAINS.BASE]: new ethers.Wallet(
    process.env.BOT_P_KEY!,
    PROVIDERS[CHAINS.BASE]
  ),
};

export const POOL_FACTORY = {
  [CHAINS.MAINNET]: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  [CHAINS.BASE]: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
};

export const QUOTER_V2 = {
  [CHAINS.MAINNET]: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  [CHAINS.BASE]: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
};

export const SWAP_ROUTER_V2 = {
  [CHAINS.MAINNET]: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
  [CHAINS.BASE]: "0x2626664c2603336E57B271c5C0b26F421741e481",
};

export const TOKENS = {
  [CHAINS.MAINNET]: {
    WETH: new Token(
      CHAINS.MAINNET,
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      18,
      "WETH",
      "Wrapped Ether"
    ),
    HUNT: new Token(
      CHAINS.MAINNET,
      "0x9AAb071B4129B083B01cB5A0Cb513Ce7ecA26fa5",
      18,
      "HUNT",
      "HuntToken"
    ),
  },
  [CHAINS.BASE]: {
    WETH: new Token(
      CHAINS.BASE,
      "0x4200000000000000000000000000000000000006",
      18,
      "WETH",
      "Wrapped Ether"
    ),
    HUNT: new Token(
      CHAINS.BASE,
      "0x37f0c2915CeCC7e977183B8543Fc0864d03E064C",
      18,
      "HUNT",
      "HuntToken"
    ),
  },
};
