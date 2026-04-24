import * as PIXI from 'pixi.js';
import type { EventBus } from '../core/EventBus';
import type { WinLine } from '../server/types';

export class WinPresentation {
  private winLines: WinLine[] = [];
  private totalWin = 0;
  private animationPhase = 0;
  private phaseTime = 0;
  private isAnimating = false;
  private readonly unsubscribers: Array<() => void> = [];
  private readonly updateTicker = (delta: number) => this.update(delta);

  readonly container: PIXI.Container;
  private readonly winText: PIXI.Text;

  constructor(
    private readonly app: PIXI.Application,
    private readonly bus: EventBus,
    width: number,
    height: number,
  ) {
    this.container = new PIXI.Container();
    this.container.visible = false;

    const winBg = new PIXI.Graphics();
    this.container.addChild(winBg);

    this.winText = new PIXI.Text('', {
      fontFamily: 'Arial',
      fontSize: 48,
      fontWeight: 'bold',
      fill: 0xffd700,
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowDistance: 4,
      stroke: 0x8b6914,
      strokeThickness: 4,
    });
    this.winText.anchor.set(0.5);
    this.winText.x = width / 2;
    this.winText.y = height / 2;
    this.container.addChild(this.winText);

    this.registerHandlers();
    this.app.ticker.add(this.updateTicker);
  }

  destroy(): void {
    this.app.ticker.remove(this.updateTicker);
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.container.destroy({ children: true });
  }

  private registerHandlers(): void {
    this.unsubscribers.push(this.bus.on('SPIN_RESULT_RECEIVED', (payload) => {
      this.winLines = payload.winLines;
      this.totalWin = payload.totalWin;
    }));

    this.unsubscribers.push(this.bus.on('WIN_PRESENTATION_STARTED', () => {
      this.startAnimation();
    }));
  }

  private startAnimation(): void {
    this.isAnimating = true;
    this.animationPhase = 0;
    this.phaseTime = 0;
    this.container.visible = true;
    this.winText.alpha = 1;
    this.winText.text = `WIN: ${this.totalWin}`;
    this.winText.scale.set(0.1);

    this.bus.emit({
      type: 'WIN_LINES_HIGHLIGHT_REQUESTED',
      payload: { winLines: this.winLines },
    });
  }

  private update(delta: number): void {
    if (!this.isAnimating) {
      return;
    }

    this.phaseTime += delta / 60;

    if (this.animationPhase === 0) {
      const t = Math.min(this.phaseTime / 0.4, 1);
      this.winText.scale.set(0.1 + 0.9 * this.easeOutBack(t));

      if (t >= 1) {
        this.animationPhase = 1;
        this.phaseTime = 0;
      }
      return;
    }

    if (this.animationPhase === 1) {
      this.winText.scale.set(1 + 0.08 * Math.sin(this.phaseTime * Math.PI * 3));

      if (this.phaseTime >= 2.0) {
        this.animationPhase = 2;
        this.phaseTime = 0;
      }
      return;
    }

    const t = Math.min(this.phaseTime / 0.3, 1);
    this.winText.alpha = 1 - t;

    if (t >= 1) {
      this.stopAnimation();
    }
  }

  private stopAnimation(): void {
    this.isAnimating = false;
    this.container.visible = false;
    this.winText.alpha = 1;
    this.bus.emit({ type: 'WIN_LINES_CLEAR_REQUESTED' });
    this.bus.emit({ type: 'WIN_PRESENTATION_COMPLETE' });
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
}
