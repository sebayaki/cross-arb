import { Token } from "@uniswap/sdk-core";
import { ethers, JsonRpcProvider } from "ethers";

export enum CHAINS {
  MAINNET = 1,
  BASE = 8453,
}

export const PROVIDERS = {
  [CHAINS.MAINNET]: new JsonRpcProvider("https://1rpc.io/eth"),
  [CHAINS.BASE]: new JsonRpcProvider("https://1rpc.io/base"),
};

export const POOL_FACTORY = {
  [CHAINS.MAINNET]: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  [CHAINS.BASE]: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
};

export const QUOTER = {
  [CHAINS.MAINNET]: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
  [CHAINS.BASE]: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
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
