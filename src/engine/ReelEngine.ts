import * as PIXI from 'pixi.js';
import { Reel } from './Reel';
import { SymbolRenderer } from './SymbolRenderer';
import type { EventBus } from '../core/EventBus';
import { GameConfig } from '../core/types';
import type { SpinResult } from '../server/types';

export class ReelEngine {
  readonly container: PIXI.Container;

  private readonly reels: Reel[] = [];
  private readonly symbolRenderer: SymbolRenderer;
  private readonly config: GameConfig;
  private readonly unsubscribers: Array<() => void> = [];
  private readonly stopChecks = new Set<() => void>();
  private readonly updateTicker = (delta: number) => this.update(delta);

  private pendingResult: SpinResult | null = null;
  private stoppedCount = 0;

  constructor(
    private readonly app: PIXI.Application,
    private readonly bus: EventBus,
    config: GameConfig,
  ) {
    this.config = config;
    this.container = new PIXI.Container();

    this.symbolRenderer = new SymbolRenderer(app.renderer, config.symbolSize);
    this.buildReels();
    this.registerHandlers();

    this.app.ticker.add(this.updateTicker);
  }

  getTotalWidth(): number {
    return this.config.reels * this.config.symbolSize + (this.config.reels - 1) * this.config.reelSpacing;
  }

  getTotalHeight(): number {
    return this.config.rows * this.config.symbolSize;
  }

  destroy(): void {
    this.clearPendingStopChecks();
    this.app.ticker.remove(this.updateTicker);

    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }

    for (const reel of this.reels) {
      reel.destroy();
    }

    this.symbolRenderer.destroyAll();
    this.container.destroy();
  }

  private buildReels(): void {
    const symbolSize = this.config.symbolSize;
    const spacing = this.config.reelSpacing;

    for (let i = 0; i < this.config.reels; i++) {
      const reel = new Reel(
        this.symbolRenderer,
        this.config.reelStrips[i],
        this.config.symbols,
        symbolSize,
        this.config.rows,
        this.config.decelerationDuration,
      );

      reel.container.x = i * (symbolSize + spacing);
      this.container.addChild(reel.container);
      this.reels.push(reel);
    }
  }

  private registerHandlers(): void {
    this.unsubscribers.push(this.bus.on('REELS_STARTED', () => this.startSpin()));
    this.unsubscribers.push(this.bus.on('RESULT_READY', (payload) => {
      this.pendingResult = payload;
      this.stopReelsCascading();
    }));
    this.unsubscribers.push(this.bus.on('WIN_LINES_HIGHLIGHT_REQUESTED', (payload) => {
      this.highlightWinLines(payload.winLines);
    }));
    this.unsubscribers.push(this.bus.on('WIN_LINES_CLEAR_REQUESTED', () => {
      this.clearHighlights();
    }));
  }

  private startSpin(): void {
    this.stoppedCount = 0;
    this.pendingResult = null;
    this.clearPendingStopChecks();

    for (const reel of this.reels) {
      reel.spin();
    }
  }

  private stopReelsCascading(): void {
    const result = this.pendingResult;
    if (!result) {
      return;
    }

    for (let i = 0; i < this.reels.length; i++) {
      const reelIndex = i;
      const delaySeconds = this.config.spinDuration + i * this.config.reelStopDelay;
      const startTime = this.app.ticker.lastTime;

      const checkStop = () => {
        const elapsed = (this.app.ticker.lastTime - startTime) / 1000;
        if (elapsed < delaySeconds) {
          return;
        }

        this.app.ticker.remove(checkStop);
        this.stopChecks.delete(checkStop);
        this.reels[reelIndex].stop(result.reels[reelIndex], () => this.onReelStopped());
      };

      this.stopChecks.add(checkStop);
      this.app.ticker.add(checkStop);
    }
  }

  private onReelStopped(): void {
    this.stoppedCount++;
    if (this.stoppedCount === this.reels.length) {
      this.bus.emit({ type: 'REELS_STOPPED' });
    }
  }

  private update(delta: number): void {
    for (const reel of this.reels) {
      reel.update(delta);
    }
  }

  private highlightWinLines(winLines: import('../server/types').WinLine[]): void {
    for (const line of winLines) {
      for (let reelIndex = 0; reelIndex < line.count; reelIndex++) {
        this.reels[reelIndex]?.highlightSymbol(line.lineIndex, 0xffdd00);
      }
    }
  }

  private clearHighlights(): void {
    for (const reel of this.reels) {
      reel.clearHighlights();
    }
  }

  private clearPendingStopChecks(): void {
    for (const checkStop of this.stopChecks) {
      this.app.ticker.remove(checkStop);
    }
    this.stopChecks.clear();
  }
}
