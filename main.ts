import { ethers } from "ethers";
import { computePoolAddress } from "@uniswap/v3-sdk";
import Quoter from "@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json";
import IUniswapV3PoolABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { CHAINS, PROVIDERS, POOL_FACTORY, QUOTER, TOKENS } from "./configs";
import { toWei, amountToString } from "./utils";

const FEE_TIER = 3000; // Scan for 0.3% fee tier

async function quote(chainId: number): Promise<string> {
  const quoterContract = new ethers.Contract(
    QUOTER[chainId],
    Quoter.abi,
    PROVIDERS[chainId]
  );
  const poolConstants = await _getPoolConstants(chainId);

  const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(
    poolConstants.token0,
    poolConstants.token1,
    poolConstants.fee,
    toWei(1n),
    0
  );

  return quotedAmountOut;
}

async function _getPoolConstants(chainId: number): Promise<{
  token0: string;
  token1: string;
  fee: number;
}> {
  const currentPoolAddress = computePoolAddress({
    factoryAddress: POOL_FACTORY[chainId],
    tokenA: TOKENS[chainId].HUNT.address,
    tokenB: TOKENS[chainId].WETH.address,
    fee: FEE_TIER,
  });

  const poolContract = new ethers.Contract(
    currentPoolAddress,
    IUniswapV3PoolABI.abi,
    PROVIDERS[chainId]
  );
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
  ]);

  return {
    token0,
    token1,
    fee,
  };
}

async function main() {
  const quotedAmountOut = await quote(CHAINS.MAINNET);
  console.log(`Mainnet HUNT price: ${amountToString(quotedAmountOut)}`);

  const quotedAmountOutBase = await quote(CHAINS.BASE);
  console.log(`Base HUNT price: ${amountToString(quotedAmountOutBase)}`);
}

main();
