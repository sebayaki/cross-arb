import { parseAbi } from "viem";
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
import { toWei, toReadable } from "./utils";
import { SqrtPriceMath } from "@uniswap/v3-sdk";
import JSBI from "jsbi";

const FEE_TIER = 3000; // Scan for 0.3% fee tier
const HUNT_AMOUNT_THRESHOLD = toWei(5n); // 5 HUNT ~ $2
const HUNT_MAX_THRESHOLD = toWei(10000n); // 10,000 HUNT

async function quote(
  chainId: number
): Promise<{ price: bigint; sqrtPriceX96After: bigint }> {
  const [price, sqrtPriceX96After] = await PROVIDERS[chainId].readContract({
    address: QUOTER_V2[chainId] as `0x${string}`,
    abi: QuoterV2.abi,
    functionName: "quoteExactInputSingle",
    args: [
      {
        tokenIn: TOKENS[chainId].HUNT.address,
        tokenOut: TOKENS[chainId].WETH.address,
        amountIn: toWei(1n),
        fee: FEE_TIER,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });

  return {
    price,
    sqrtPriceX96After,
  };
}

async function _getPoolLiquidity(chainId: number): Promise<bigint> {
  const currentPoolAddress = computePoolAddress({
    factoryAddress: POOL_FACTORY[chainId],
    tokenA: TOKENS[chainId].HUNT,
    tokenB: TOKENS[chainId].WETH,
    fee: FEE_TIER,
  });

  return await PROVIDERS[chainId].readContract({
    address: currentPoolAddress as `0x${string}`,
    abi: IUniswapV3PoolABI.abi,
    functionName: "liquidity",
  });
}

async function getBalances(chainId: number) {
  const huntAbi = parseAbi([
    "function balanceOf(address) view returns (uint256)",
  ]);
  const walletAddress = WALLETS[chainId].account.address;

  const [eth, hunt] = await Promise.all([
    PROVIDERS[chainId].getBalance({ address: walletAddress }),
    PROVIDERS[chainId].readContract({
      address: TOKENS[chainId].HUNT.address as `0x${string}`,
      abi: huntAbi,
      functionName: "balanceOf",
      args: [walletAddress],
    }),
  ]);

  return { eth, hunt };
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
    const [ethRequired] = await PROVIDERS[chainId].readContract({
      address: QUOTER_V2[chainId] as `0x${string}`,
      abi: QuoterV2.abi,
      functionName: "quoteExactOutputSingle",
      args: [
        {
          tokenIn: TOKENS[chainId].WETH.address,
          tokenOut: TOKENS[chainId].HUNT.address,
          amount: amountHunt, // amountOut
          fee: FEE_TIER,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });

    console.log(
      `  -> Buying ${toReadable(amountHunt)} HUNT will cost ${toReadable(
        ethRequired
      )} WETH`
    );

    tx = await WALLETS[chainId].writeContract({
      address: SWAP_ROUTER_V2[chainId] as `0x${string}`,
      abi: SwapRouterV2.abi,
      functionName: "exactOutputSingle",
      args: [
        {
          tokenIn: TOKENS[chainId].WETH.address,
          tokenOut: TOKENS[chainId].HUNT.address,
          fee: FEE_TIER,
          recipient: WALLETS[chainId].account.address,
          deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 20), // 20 minutes from the current time
          amountOut: amountHunt,
          amountInMaximum: ethRequired, // No slippage
          sqrtPriceLimitX96: 0n, // No price limit
        },
      ],
    });
    console.log(`  -> Buying TX: ${tx}`);
  } else {
    // Selling HUNT for WETH (exact input)
    const [ethToReceive] = await PROVIDERS[chainId].readContract({
      address: QUOTER_V2[chainId] as `0x${string}`,
      abi: QuoterV2.abi,
      functionName: "quoteExactInputSingle",
      args: [
        {
          tokenIn: TOKENS[chainId].HUNT.address,
          tokenOut: TOKENS[chainId].WETH.address,
          amountIn: amountHunt, // amountIn
          fee: FEE_TIER,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });

    console.log(
      `  -> Selling ${toReadable(amountHunt)} HUNT will get ${toReadable(
        ethToReceive
      )} WETH`
    );

    tx = await WALLETS[chainId].writeContract({
      address: SWAP_ROUTER_V2[chainId] as `0x${string}`,
      abi: SwapRouterV2.abi,
      functionName: "exactInputSingle",
      args: [
        {
          tokenIn: TOKENS[chainId].HUNT.address,
          tokenOut: TOKENS[chainId].WETH.address,
          fee: FEE_TIER,
          recipient: WALLETS[chainId].account.address,
          deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 20), // 20 minutes from the current time
          amountIn: amountHunt, // Exact amount of HUNT to sell
          amountOutMinimum: ethToReceive, // No slippage
          sqrtPriceLimitX96: 0n, // No price limit
        },
      ],
    });
    console.log(`  -> Selling TX: ${tx}`);
  }

  try {
    await PROVIDERS[chainId].waitForTransactionReceipt({
      hash: tx,
    });
    console.log(`  -> Swap completed!`);
    printDiffs(initialBalances);
  } catch (error) {
    console.error(`Error during swap: ${error.message}`);
  }
}

async function printPrices() {
  const mainnet = await quote(CHAINS.MAINNET);
  const base = await quote(CHAINS.BASE);

  console.log(
    `HUNT Price - mainnetnet: ${toReadable(
      mainnet.price
    )} ETH | Base: ${toReadable(base.price)} ETH (${
      base.price - mainnet.price > 0 ? "+" : ""
    }${(
      (100 * Number(base.price - mainnet.price)) /
      Number(base.price)
    ).toFixed(3)}%)`
  );

  return { mainnet, base };
}

async function main() {
  let mainnet, base;
  try {
    const p = await printPrices();
    mainnet = p.mainnet;
    base = p.base;
  } catch (error) {
    console.error(`Error during price check:`, error.message);
    return;
  }

  const isBuy = mainnet.price > base.price;
  const direction = isBuy ? "Base BUY" : "Base SELL";

  let liquidity;
  try {
    liquidity = await _getPoolLiquidity(CHAINS.BASE);
  } catch (error) {
    console.error(`Error during liquidity check:`, error.message);
    return;
  }

  // console.log(`Base pool liquidity: ${toReadable(liquidity)} HUNT-WETH LP tokens`);
  let adjustAmount = BigInt(
    SqrtPriceMath.getAmount0Delta(
      JSBI.BigInt(base.sqrtPriceX96After.toString()),
      JSBI.BigInt(mainnet.sqrtPriceX96After.toString()),
      JSBI.BigInt(liquidity.toString()),
      true // round up to match prices accurately
    ).toString()
  );

  if (adjustAmount > HUNT_AMOUNT_THRESHOLD) {
    console.log(`-> ${direction}: ${toReadable(adjustAmount)} HUNT`);

    if (adjustAmount > HUNT_MAX_THRESHOLD) {
      console.log(
        `-> ${direction}: Adjusting ${toReadable(adjustAmount)} -> ${toReadable(
          HUNT_MAX_THRESHOLD
        )} HUNT (max)`
      );
      adjustAmount = HUNT_MAX_THRESHOLD;
    }

    await swapTokens(CHAINS.BASE, BigInt(String(adjustAmount)), isBuy);
    await printPrices();
  } else {
    console.log(
      `-> adjustAmount below threshold: ${toReadable(adjustAmount)} HUNT`
    );
  }
}

function getRandomWaitTime(): number {
  const minMs = 30 * 1000; // 30 seconds
  const maxMs = 5 * 60 * 1000; // 5 minutes
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

async function runForever() {
  while (true) {
    try {
      await main();
      const delay = getRandomWaitTime();
      console.log(`Waiting for ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      console.error(`Error: ${error.message}`);
      const delay = getRandomWaitTime();
      console.log(
        `An error occurred. Waiting for ${
          delay / 1000
        } seconds before retrying...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

runForever().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
