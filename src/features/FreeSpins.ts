import * as PIXI from 'pixi.js';
import type { EventBus } from '../core/EventBus';

export class FreeSpins {
  private remaining = 0;
  private active = false;
  private awardIntroCountdown = 0;
  private waitingForIdle = false;
  private readonly unsubscribers: Array<() => void> = [];
  private readonly updateTicker = (delta: number) => this.update(delta);

  constructor(
    private readonly app: PIXI.Application,
    private readonly bus: EventBus,
  ) {
    this.registerHandlers();
    this.app.ticker.add(this.updateTicker);
  }

  isActive(): boolean {
    return this.active;
  }

  getRemaining(): number {
    return this.remaining;
  }

  destroy(): void {
    this.app.ticker.remove(this.updateTicker);
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
  }

  private update(delta: number): void {
    if (this.awardIntroCountdown <= 0) {
      return;
    }

    this.awardIntroCountdown -= delta / 60;
    if (this.awardIntroCountdown <= 0) {
      this.awardIntroCountdown = 0;
      if (this.waitingForIdle) {
        this.waitingForIdle = false;
        this.triggerNextSpin();
      }
    }
  }

  private registerHandlers(): void {
    this.unsubscribers.push(this.bus.on('FREE_SPINS_AWARDED', (payload) => {
      this.onFreeSpinsAwarded(payload.count);
    }));

    this.unsubscribers.push(this.bus.on('SPIN_RESULT_RECEIVED', (payload) => {
      if (!this.active || payload.freeSpinsRemaining === undefined) {
        return;
      }

      this.remaining = payload.freeSpinsRemaining;
      this.bus.emit({ type: 'FREE_SPINS_COUNT_UPDATED', payload: { count: this.remaining } });
    }));

    this.unsubscribers.push(this.bus.on('ROUND_COMPLETE', () => {
      if (!this.active) {
        return;
      }

      this.onRoundComplete();
    }));
  }

  private onFreeSpinsAwarded(count: number): void {
    this.remaining = Math.max(this.remaining, count);
    this.active = true;
    this.awardIntroCountdown = 1.5;
    this.waitingForIdle = false;

    this.bus.emit({ type: 'FREE_SPINS_BANNER_SHOWN', payload: { count } });
    this.bus.emit({ type: 'FREE_SPINS_COUNT_UPDATED', payload: { count: this.remaining } });
  }

  private onRoundComplete(): void {
    if (this.remaining <= 0) {
      this.end();
      return;
    }

    if (this.awardIntroCountdown > 0) {
      this.waitingForIdle = true;
      return;
    }

    this.triggerNextSpin();
  }

  private triggerNextSpin(): void {
    if (this.remaining <= 0) {
      this.end();
      return;
    }

    this.bus.emit({ type: 'SPIN_REQUESTED' });
  }

  private end(): void {
    this.active = false;
    this.remaining = 0;
    this.awardIntroCountdown = 0;
    this.waitingForIdle = false;
    this.bus.emit({ type: 'FREE_SPINS_BANNER_HIDDEN' });
    this.bus.emit({ type: 'FREE_SPINS_COUNT_UPDATED', payload: { count: 0 } });
    this.bus.emit({ type: 'FREE_SPINS_EXHAUSTED' });
  }
}
