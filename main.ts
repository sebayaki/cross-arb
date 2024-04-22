import { ethers } from "ethers";
import { computePoolAddress } from "@uniswap/v3-sdk";
import QuoterV2 from "@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json";
import SwapRouterV2 from "@uniswap/swap-router-contracts/artifacts/contracts/SwapRouter02.sol/SwapRouter02.json";
import IUniswapV3PoolABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import {
  CHAINS,
  PROVIDERS,
  WALLETS,
  POOL_FACTORY,
  QUOTER_V2,
  SWAP_ROUTER_V2,
  TOKENS,
} from "./configs";
import { toWei, toReadable, MAX_INT_256 } from "./utils";
import { SqrtPriceMath } from "@uniswap/v3-sdk";
import JSBI from "jsbi";

const FEE_TIER = 3000; // Scan for 0.3% fee tier
const HUNT_AMOUNT_THRESHOLD = toWei(5n); // 5 HUNT ~ $2

async function quote(
  chainId: number
): Promise<{ price: bigint; sqrtPriceX96After: bigint }> {
  const quoterContract = new ethers.Contract(
    QUOTER_V2[chainId],
    QuoterV2.abi,
    WALLETS[chainId]
  );

  const quotedAmountOut =
    await quoterContract.quoteExactInputSingle.staticCallResult([
      TOKENS[chainId].HUNT.address,
      TOKENS[chainId].WETH.address,
      toWei(1n),
      FEE_TIER,
      0,
    ]);

  return {
    price: quotedAmountOut[0],
    sqrtPriceX96After: quotedAmountOut[1],
  };
}

async function _getPoolLiquidity(chainId: number): Promise<bigint> {
  const currentPoolAddress = computePoolAddress({
    factoryAddress: POOL_FACTORY[chainId],
    tokenA: TOKENS[chainId].HUNT,
    tokenB: TOKENS[chainId].WETH,
    fee: FEE_TIER,
  });

  // console.log(currentPoolAddress);
  const poolContract = new ethers.Contract(
    currentPoolAddress,
    IUniswapV3PoolABI.abi,
    PROVIDERS[chainId]
  );

  return await poolContract.liquidity();
}

async function getBalances(chainId: number) {
  const huntContract = new ethers.Contract(
    TOKENS[chainId].HUNT.address,
    ["function balanceOf(address) view returns (uint256)"],
    PROVIDERS[chainId]
  );

  return {
    eth: await PROVIDERS[chainId].getBalance(WALLETS[chainId].address),
    hunt: await huntContract.balanceOf(WALLETS[chainId].address),
  };
}

async function printDiffs(initial: { eth: bigint; hunt: bigint }) {
  const current = await getBalances(CHAINS.BASE);
  console.log(
    `  -> Current balances: ETH: ${toReadable(
      current.eth
    )} | HUNT: ${toReadable(current.hunt)}`
  );

  const diffEth = current.eth - initial.eth;
  const diffHunt = current.hunt - initial.hunt;

  console.log(
    `  -> Differences: ETH: ${diffEth > 0 ? "+" : ""}${toReadable(
      diffEth
    )} | HUNT: ${diffHunt > 0 ? "+" : ""}${toReadable(diffHunt)}`
  );
}

async function swapTokens(
  chainId: number,
  amountHunt: bigint,
  isBuy: boolean
): Promise<void> {
  const router = new ethers.Contract(
    SWAP_ROUTER_V2[chainId],
    SwapRouterV2.abi,
    WALLETS[chainId]
  );
  const quoterContract = new ethers.Contract(
    QUOTER_V2[chainId],
    QuoterV2.abi,
    WALLETS[chainId]
  );

  // Get initial ETH and HUNT balances
  const initialBalances = await getBalances(chainId);
  console.log(
    `  -> Initial balances: ETH: ${toReadable(
      initialBalances.eth
    )} | HUNT: ${toReadable(initialBalances.hunt)}`
  );

  let tx;
  if (isBuy) {
    // Buying HUNT with WETH (exact output)
    const quotedAmountIn =
      await quoterContract.quoteExactOutputSingle.staticCallResult([
        TOKENS[chainId].WETH.address,
        TOKENS[chainId].HUNT.address,
        amountHunt, // amountOut
        FEE_TIER,
        0,
      ]);
    const ethRequired = quotedAmountIn[0];

    console.log(
      `  -> Buying ${toReadable(amountHunt)} HUNT will cost ${toReadable(
        ethRequired
      )} WETH`
    );

    tx = await router.exactOutputSingle({
      tokenIn: TOKENS[chainId].WETH.address,
      tokenOut: TOKENS[chainId].HUNT.address,
      fee: FEE_TIER,
      recipient: WALLETS[chainId].address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current time
      amountOut: amountHunt,
      amountInMaximum: ethRequired, // No slippage
      sqrtPriceLimitX96: 0, // No price limit
    });
    console.log(`  -> Buying TX: ${tx.hash}`);
  } else {
    // Selling HUNT for WETH (exact input)
    const quotedAmountOut =
      await quoterContract.quoteExactInputSingle.staticCallResult([
        TOKENS[chainId].HUNT.address,
        TOKENS[chainId].WETH.address,
        amountHunt, // amountIn
        FEE_TIER,
        0,
      ]);
    const ethToReceive = quotedAmountOut[0];

    console.log(
      `  -> Selling ${toReadable(amountHunt)} HUNT will get ${toReadable(
        ethToReceive
      )} WETH`
    );

    tx = await router.exactInputSingle({
      tokenIn: TOKENS[chainId].HUNT.address,
      tokenOut: TOKENS[chainId].WETH.address,
      fee: FEE_TIER,
      recipient: WALLETS[chainId].address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current time
      amountIn: amountHunt, // Exact amount of HUNT to sell
      amountOutMinimum: ethToReceive, // No slippage
      sqrtPriceLimitX96: 0, // No price limit
    });
    console.log(`  -> Selling TX: ${tx.hash}`);
  }

  try {
    const receipt = await tx.wait();
    console.log(`  -> Swap completed!`);
    printDiffs(initialBalances);
  } catch (error) {
    console.error(`Error during swap: ${error.message}`);
  }
}

async function printPrices() {
  const main = await quote(CHAINS.MAINNET);
  const base = await quote(CHAINS.BASE);

  console.log(
    `HUNT Price - Mainnet: ${toReadable(main.price)} ETH | Base: ${toReadable(
      base.price
    )} ETH (${base.price - main.price > 0 ? "+" : ""}${(
      (100 * Number(base.price - main.price)) /
      Number(base.price)
    ).toFixed(3)}%)`
  );

  return { main, base };
}

async function main() {
  const { main, base } = await printPrices();

  const isBuy = main.price > base.price;
  const direction = isBuy ? "Base BUY" : "Base SELL";

  const liquidity = await _getPoolLiquidity(CHAINS.BASE);
  // console.log(`Base pool liquidity: ${toReadable(liquidity)} HUNT-WETH LP tokens`);
  const adjustAmount = BigInt(
    SqrtPriceMath.getAmount0Delta(
      JSBI.BigInt(base.sqrtPriceX96After.toString()),
      JSBI.BigInt(main.sqrtPriceX96After.toString()),
      JSBI.BigInt(liquidity.toString()),
      true // round up to match prices accurately
    ).toString()
  );

  if (adjustAmount > HUNT_AMOUNT_THRESHOLD) {
    console.log(`-> ${direction}: ${toReadable(adjustAmount)} HUNT`);

    await swapTokens(CHAINS.BASE, BigInt(String(adjustAmount)), isBuy);
    await printPrices();
  } else {
    console.log(
      `-> adjustAmount below threshold: ${toReadable(adjustAmount)} HUNT`
    );
  }
}

async function runForever() {
  while (true) {
    await main();
    await new Promise((resolve) => setTimeout(resolve, 3000)); // 3s
  }
}

runForever().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
