import { Token } from "@uniswap/sdk-core";
import {
  createPublicClient,
  http,
  fallback,
  createWalletClient,
  PrivateKeyAccount,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, base } from "viem/chains";
import dotenv from "dotenv";
dotenv.config();

export enum CHAINS {
  MAINNET = 1,
  BASE = 8453,
}

const RPC_SERVERS = {
  [CHAINS.MAINNET]: [
    "https://ethereum-rpc.publicnode.com",
    "https://eth.drpc.org",
    "https://eth-mainnet.public.blastapi.io",
    "https://ethereum.rpc.subquery.network/public",
    "https://rpc.payload.de",
    "https://ethereum.public.blockpi.network/v1/rpc/public",
    "https://rpc.flashbots.net",
    "https://0xrpc.io/eth",
    "https://rpc.flashbots.net/fast",
    "https://rpc.therpc.io/ethereum",
    "https://eth.meowrpc.com",
    "https://eth-pokt.nodies.app",
    "https://eth.blockrazor.xyz",
    "https://eth.merkle.io",
    "https://endpoints.omniatech.io/v1/eth/mainnet/public",
    "https://1rpc.io/eth",
  ],
  [CHAINS.BASE]: [
    "https://base-rpc.publicnode.com",
    "https://base.drpc.org",
    "https://mainnet.base.org",
    "https://developer-access-mainnet.base.org",
    "https://0xrpc.io/base",
    "https://base-pokt.nodies.app",
    "https://base.public.blockpi.network/v1/rpc/public",
    "https://base.meowrpc.com",
    "https://base.rpc.subquery.network/public",
    "https://base-mainnet.public.blastapi.io",
    "https://rpc.therpc.io/base",
    "https://endpoints.omniatech.io/v1/base/mainnet/public",
    "https://base.api.onfinality.io/public",
    "https://rpc.owlracle.info/base/70d38ce1826c4a60bb2a8e05a6c8b20f",
    "https://1rpc.io/base",
  ],
};

export const PROVIDERS = {
  [CHAINS.MAINNET]: createPublicClient({
    chain: mainnet,
    transport: fallback(
      RPC_SERVERS[CHAINS.MAINNET].map((rpc) => http(rpc)),
      {
        rank: false,
      }
    ),
  }),
  [CHAINS.BASE]: createPublicClient({
    chain: base,
    transport: fallback(
      RPC_SERVERS[CHAINS.BASE].map((rpc) => http(rpc)),
      {
        rank: false,
      }
    ),
  }),
};

const account: PrivateKeyAccount = privateKeyToAccount(
  process.env.BOT_P_KEY! as `0x${string}`
);

export const WALLETS = {
  [CHAINS.MAINNET]: createWalletClient({
    account,
    chain: mainnet,
    transport: fallback(
      RPC_SERVERS[CHAINS.MAINNET].map((rpc) => http(rpc)),
      {
        rank: false,
      }
    ),
  }),
  [CHAINS.BASE]: createWalletClient({
    account,
    chain: base,
    transport: fallback(
      RPC_SERVERS[CHAINS.BASE].map((rpc) => http(rpc)),
      {
        rank: false,
      }
    ),
  }),
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
