import { GameState } from './types';
import type { EventBus } from './EventBus';
import type { SpinResult } from '../server/types';
import { fetchSpinResult } from '../server/mockServer';

export class GameStateMachine {
  private state: GameState = GameState.IDLE;
  private pendingResult: SpinResult | null = null;
  private pendingFreeSpinsRemaining = 0;
  private balance: number;
  private bet: number;
  private readonly unsubscribers: Array<() => void> = [];

  constructor(
    private readonly bus: EventBus,
    initialBalance: number,
    initialBet: number,
  ) {
    this.balance = initialBalance;
    this.bet = initialBet;
    this.registerHandlers();
  }

  getState(): GameState {
    return this.state;
  }

  getBalance(): number {
    return this.balance;
  }

  getBet(): number {
    return this.bet;
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
  }

  private transition(next: GameState): void {
    console.log(`[StateMachine] ${this.state} -> ${next}`);
    this.state = next;
  }

  private registerHandlers(): void {
    this.unsubscribers.push(this.bus.on('SPIN_REQUESTED', () => this.onSpinRequested()));
    this.unsubscribers.push(this.bus.on('REELS_STOPPED', () => this.onReelsStopped()));
    this.unsubscribers.push(this.bus.on('WIN_PRESENTATION_COMPLETE', () => this.onWinPresentationComplete()));
    this.unsubscribers.push(this.bus.on('FREE_SPINS_EXHAUSTED', () => this.onFreeSpinsExhausted()));
    this.unsubscribers.push(this.bus.on('BET_CHANGED', (payload) => this.onBetChanged(payload)));
  }

  private async onSpinRequested(): Promise<void> {
    if (this.state !== GameState.IDLE && this.state !== GameState.FREE_SPINS_IDLE) {
      return;
    }

    const isFreeSpinRound = this.state === GameState.FREE_SPINS_IDLE;
    if (!isFreeSpinRound && this.balance < this.bet) {
      return;
    }

    if (!isFreeSpinRound) {
      this.balance -= this.bet;
      this.bus.emit({ type: 'BALANCE_UPDATED', payload: { balance: this.balance } });
    }

    this.transition(isFreeSpinRound ? GameState.FREE_SPINS_SPINNING : GameState.SPINNING);
    this.bus.emit({ type: 'REELS_STARTED' });

    try {
      this.pendingResult = await fetchSpinResult(this.bet, isFreeSpinRound);
      this.bus.emit({ type: 'RESULT_READY', payload: this.pendingResult });
    } catch (err) {
      console.error('[StateMachine] Server error:', err);
      this.bus.emit({ type: 'REELS_STOPPED' });
      this.transition(GameState.IDLE);
      this.bus.emit({ type: 'ROUND_COMPLETE' });
    }
  }

  private onReelsStopped(): void {
    if (this.state !== GameState.SPINNING && this.state !== GameState.FREE_SPINS_SPINNING) {
      return;
    }

    const result = this.pendingResult;
    if (!result) {
      return;
    }

    this.pendingFreeSpinsRemaining = result.freeSpinsRemaining ?? 0;
    this.pendingResult = null;

    this.balance = result.balanceAfter;
    this.bus.emit({ type: 'BALANCE_UPDATED', payload: { balance: this.balance } });

    const isFreeSpinRound = this.state === GameState.FREE_SPINS_SPINNING;
    this.transition(isFreeSpinRound ? GameState.FREE_SPINS_RESULT : GameState.RESULT);

    this.bus.emit({ type: 'SPIN_RESULT_RECEIVED', payload: result });

    if (result.freeSpinsAwarded && result.freeSpinsAwarded > 0) {
      this.bus.emit({ type: 'FREE_SPINS_AWARDED', payload: { count: result.freeSpinsAwarded } });
    }

    if (result.totalWin > 0) {
      this.transition(GameState.WIN_PRESENTATION);
      this.bus.emit({ type: 'WIN_PRESENTATION_STARTED' });
      return;
    }

    if (result.freeSpinsAwarded && result.freeSpinsAwarded > 0) {
      this.transition(GameState.FREE_SPINS_IDLE);
      this.bus.emit({ type: 'ROUND_COMPLETE' });
      return;
    }

    this.transition(isFreeSpinRound ? GameState.FREE_SPINS_IDLE : GameState.IDLE);
    this.bus.emit({ type: 'ROUND_COMPLETE' });
  }

  private onWinPresentationComplete(): void {
    if (this.state !== GameState.WIN_PRESENTATION) {
      return;
    }

    const goToFreeSpins = this.pendingFreeSpinsRemaining > 0;
    this.pendingFreeSpinsRemaining = 0;

    this.transition(goToFreeSpins ? GameState.FREE_SPINS_IDLE : GameState.IDLE);
    this.bus.emit({ type: 'ROUND_COMPLETE' });
  }

  private onFreeSpinsExhausted(): void {
    if (
      this.state !== GameState.FREE_SPINS_IDLE &&
      this.state !== GameState.FREE_SPINS_RESULT &&
      this.state !== GameState.WIN_PRESENTATION
    ) {
      return;
    }

    this.transition(GameState.IDLE);
    this.bus.emit({ type: 'ROUND_COMPLETE' });
  }

  private onBetChanged(payload: { bet: number }): void {
    if (this.state !== GameState.IDLE) {
      return;
    }

    this.bet = payload.bet;
  }
}
