export interface WinLine {
  lineIndex: number;
  symbolIndex: number;
  count: number;
  payout: number;
}

export interface SpinResult {
  reels: number[][];
  winLines: WinLine[];
  totalWin: number;
  balanceAfter: number;
  freeSpinsAwarded?: number;
  freeSpinsRemaining?: number;
}
