import type { SpinResult, WinLine } from './types';
import gameConfig from '../config/gameConfig.json';

const SCATTER_INDEX = gameConfig.symbols.indexOf('SCATTER');
const WILD_INDEX = gameConfig.symbols.indexOf('WILD');

let mockBalance = 1000;
let freeSpinsRemaining = 0;

function pickStopIndex(reelIndex: number): number {
  const strip = gameConfig.reelStrips[reelIndex];
  return Math.floor(Math.random() * strip.length);
}

function findStopIndexForTopSymbol(reelIndex: number, symbolIndex: number): number {
  const strip = gameConfig.reelStrips[reelIndex];
  const matches: number[] = [];

  for (let i = 0; i < strip.length; i++) {
    if (strip[i] === symbolIndex) {
      matches.push(i);
    }
  }

  if (matches.length === 0) {
    return pickStopIndex(reelIndex);
  }

  return matches[Math.floor(Math.random() * matches.length)];
}

function generateReelResult(forceScatter = false): number[][] {
  const reels: number[][] = [];

  for (let reelIndex = 0; reelIndex < gameConfig.reels; reelIndex++) {
    const forceScatterOnReel = forceScatter
      && (reelIndex === 0 || reelIndex === 2 || reelIndex === gameConfig.reels - 1);
    const stopIndex = forceScatterOnReel
      ? findStopIndexForTopSymbol(reelIndex, SCATTER_INDEX)
      : pickStopIndex(reelIndex);
    const strip = gameConfig.reelStrips[reelIndex];
    const column: number[] = [];

    for (let row = 0; row < gameConfig.rows; row++) {
      column.push(strip[(stopIndex + row) % strip.length]);
    }

    reels.push(column);
  }

  return reels;
}

function evaluateWins(reelResult: number[][], bet: number): WinLine[] {
  const wins: WinLine[] = [];

  for (let row = 0; row < gameConfig.rows; row++) {
    const firstSymbol = reelResult[0][row];
    if (firstSymbol === SCATTER_INDEX) {
      continue;
    }

    let count = 1;
    for (let reelIndex = 1; reelIndex < gameConfig.reels; reelIndex++) {
      const symbol = reelResult[reelIndex][row];
      if (symbol === firstSymbol || symbol === WILD_INDEX) {
        count++;
      } else {
        break;
      }
    }

    if (count >= 3) {
      wins.push({
        lineIndex: row,
        symbolIndex: firstSymbol,
        count,
        payout: bet * count * (firstSymbol + 1),
      });
    }
  }

  return wins;
}

function countScatters(reelResult: number[][]): number {
  let count = 0;
  for (const column of reelResult) {
    for (const symbol of column) {
      if (symbol === SCATTER_INDEX) {
        count++;
      }
    }
  }
  return count;
}

function simulateNetworkDelay(): Promise<void> {
  const ms = 300 + Math.random() * 400;
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = () => {
      if (performance.now() - start >= ms) {
        resolve();
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
}

export async function fetchSpinResult(bet: number, isFreeSpinRound: boolean): Promise<SpinResult> {
  await simulateNetworkDelay();

  const effectiveBet = isFreeSpinRound ? 0 : bet;
  const forceScatter = !isFreeSpinRound && Math.random() < 0.12;
  const reelResult = generateReelResult(forceScatter);
  const scatterCount = countScatters(reelResult);
  const winLines = evaluateWins(reelResult, bet);
  const totalWin = winLines.reduce((sum, line) => sum + line.payout, 0);

  let freeSpinsAwarded: number | undefined;
  if (scatterCount >= 3) {
    freeSpinsAwarded = gameConfig.freeSpinsCount;
    freeSpinsRemaining += gameConfig.freeSpinsCount;
  }

  if (isFreeSpinRound) {
    freeSpinsRemaining = Math.max(0, freeSpinsRemaining - 1);
  }

  mockBalance = mockBalance - effectiveBet + totalWin;

  return {
    reels: reelResult,
    winLines,
    totalWin,
    balanceAfter: mockBalance,
    freeSpinsAwarded,
    freeSpinsRemaining,
  };
}

export function resetMockBalance(amount: number): void {
  mockBalance = amount;
  freeSpinsRemaining = 0;
}
