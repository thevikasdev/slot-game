export enum GameState {
  IDLE = 'IDLE',
  SPINNING = 'SPINNING',
  RESULT = 'RESULT',
  WIN_PRESENTATION = 'WIN_PRESENTATION',
  FREE_SPINS_IDLE = 'FREE_SPINS_IDLE',
  FREE_SPINS_SPINNING = 'FREE_SPINS_SPINNING',
  FREE_SPINS_RESULT = 'FREE_SPINS_RESULT',
}

export type GameEvent =
  | { type: 'SPIN_REQUESTED' }
  | { type: 'REELS_STARTED' }
  | { type: 'RESULT_READY'; payload: import('../server/types').SpinResult }
  | { type: 'SPIN_RESULT_RECEIVED'; payload: import('../server/types').SpinResult }
  | { type: 'REELS_STOPPED' }
  | { type: 'WIN_PRESENTATION_STARTED' }
  | { type: 'WIN_PRESENTATION_COMPLETE' }
  | { type: 'WIN_LINES_HIGHLIGHT_REQUESTED'; payload: { winLines: import('../server/types').WinLine[] } }
  | { type: 'WIN_LINES_CLEAR_REQUESTED' }
  | { type: 'FREE_SPINS_AWARDED'; payload: { count: number } }
  | { type: 'FREE_SPINS_EXHAUSTED' }
  | { type: 'FREE_SPINS_COUNT_UPDATED'; payload: { count: number } }
  | { type: 'FREE_SPINS_BANNER_SHOWN'; payload: { count: number } }
  | { type: 'FREE_SPINS_BANNER_HIDDEN' }
  | { type: 'ROUND_COMPLETE' }
  | { type: 'BALANCE_UPDATED'; payload: { balance: number } }
  | { type: 'BET_CHANGED'; payload: { bet: number } };

export type GameEventType = GameEvent['type'];

export type EventPayload<T extends GameEventType> = Extract<GameEvent, { type: T }> extends { payload: infer P }
  ? P
  : undefined;

export interface GameConfig {
  reels: number;
  rows: number;
  symbols: string[];
  reelStrips: number[][];
  freeSpinsCount: number;
  betOptions: number[];
  defaultBet: number;
  symbolSize: number;
  reelSpacing: number;
  spinDuration: number;
  decelerationDuration: number;
  reelStopDelay: number;
}
