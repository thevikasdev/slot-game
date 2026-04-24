import * as PIXI from 'pixi.js';
import { GameState } from '../core/types';
import type { EventBus } from '../core/EventBus';

interface HUDConfig {
  width: number;
  betOptions: number[];
  defaultBet: number;
}

/**
 * HUD — the single source of truth for all player-facing display values.
 *
 * Uses v7 event system: eventMode = 'static' (NOT interactive = true).
 *
 * The spin button's enabled state tracks GameState directly.
 * States that allow spin: IDLE, FREE_SPINS_IDLE.
 * All other states: button is disabled and visually dimmed.
 */
export class HUD {
  readonly container: PIXI.Container;
  private readonly unsubscribers: Array<() => void> = [];

  private balanceText!: PIXI.Text;
  private betText!: PIXI.Text;
  private winText!: PIXI.Text;
  private freeSpinsText!: PIXI.Text;
  private spinButton!: PIXI.Container;
  private spinButtonBg!: PIXI.Graphics;
  private spinButtonLabel!: PIXI.Text;
  private freeSpinsBanner!: PIXI.Container;
  private freeSpinsCountText!: PIXI.Text;

  private currentBetIndex: number;
  private readonly betOptions: number[];
  private isSpinEnabled = true;

  constructor(
    private readonly bus: EventBus,
    config: HUDConfig,
  ) {
    this.betOptions = config.betOptions;
    this.currentBetIndex = config.betOptions.indexOf(config.defaultBet);
    if (this.currentBetIndex === -1) this.currentBetIndex = 0;

    this.container = new PIXI.Container();

    const bg = new PIXI.Graphics();
    bg.beginFill(0x0d0d1a, 0.95);
    bg.drawRect(0, 0, config.width, 100);
    bg.endFill();
    this.container.addChild(bg);

    this.balanceText = this.makeLabel('Balance: 1000', 20, 20);
    this.betText = this.makeLabel(`Bet: ${config.betOptions[this.currentBetIndex]}`, 20, 55);
    this.winText = this.makeLabel('Win: 0', config.width / 2 - 50, 20);
    this.freeSpinsText = this.makeLabel('', config.width / 2 - 50, 55);
    this.freeSpinsText.style.fill = 0xffd700;

    this.spinButton = this.buildSpinButton(config.width - 140, 10);
    this.buildBetButtons(config.width - 260, 55);

    this.freeSpinsBanner = this.buildFreeSpinsBanner(config.width);
    this.freeSpinsBanner.visible = false;

    this.freeSpinsCountText = this.makeLabel('', config.width / 2 + 100, 55);
    this.freeSpinsCountText.style.fill = 0xffd700;

    this.container.addChild(
      this.balanceText,
      this.betText,
      this.winText,
      this.freeSpinsText,
      this.freeSpinsCountText,
      this.spinButton,
      this.freeSpinsBanner,
    );

    this.registerHandlers();
  }

  private makeLabel(text: string, x: number, y: number): PIXI.Text {
    const t = new PIXI.Text(text, {
      fontFamily: 'Arial',
      fontSize: 18,
      fill: 0xffffff,
      fontWeight: 'bold',
    });
    t.x = x;
    t.y = y;
    this.container.addChild(t);
    return t;
  }

  private buildSpinButton(x: number, y: number): PIXI.Container {
    const btn = new PIXI.Container();
    btn.x = x;
    btn.y = y;

    this.spinButtonBg = new PIXI.Graphics();
    this.drawSpinButtonBg(0x27ae60);
    btn.addChild(this.spinButtonBg);

    this.spinButtonLabel = new PIXI.Text('SPIN', {
      fontFamily: 'Arial',
      fontSize: 20,
      fontWeight: 'bold',
      fill: 0xffffff,
    });
    this.spinButtonLabel.anchor.set(0.5);
    this.spinButtonLabel.x = 60;
    this.spinButtonLabel.y = 40;
    btn.addChild(this.spinButtonLabel);

    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', () => this.onSpinPressed());
    btn.on('pointerover', () => { if (this.isSpinEnabled) this.drawSpinButtonBg(0x2ecc71); });
    btn.on('pointerout', () => { if (this.isSpinEnabled) this.drawSpinButtonBg(0x27ae60); });

    return btn;
  }

  private drawSpinButtonBg(color: number): void {
    this.spinButtonBg.clear();
    this.spinButtonBg.lineStyle(2, 0x1a8a4a);
    this.spinButtonBg.beginFill(color);
    this.spinButtonBg.drawRoundedRect(0, 0, 120, 80, 10);
    this.spinButtonBg.endFill();
  }

  private buildBetButtons(x: number, y: number): void {
    const minusBtn = this.buildSmallButton('-', x, y, () => this.changeBet(-1));
    const plusBtn = this.buildSmallButton('+', x + 60, y, () => this.changeBet(1));
    this.container.addChild(minusBtn, plusBtn);
  }

  private buildSmallButton(label: string, x: number, y: number, onClick: () => void): PIXI.Container {
    const btn = new PIXI.Container();
    btn.x = x;
    btn.y = y;

    const bg = new PIXI.Graphics();
    bg.beginFill(0x2c3e50);
    bg.lineStyle(1, 0x4a6fa5);
    bg.drawRoundedRect(0, 0, 44, 28, 6);
    bg.endFill();

    const text = new PIXI.Text(label, {
      fontFamily: 'Arial',
      fontSize: 18,
      fontWeight: 'bold',
      fill: 0xffffff,
    });
    text.anchor.set(0.5);
    text.x = 22;
    text.y = 14;

    btn.addChild(bg, text);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', onClick);
    return btn;
  }

  private buildFreeSpinsBanner(width: number): PIXI.Container {
    const banner = new PIXI.Container();

    const bg = new PIXI.Graphics();
    bg.beginFill(0x8e44ad, 0.9);
    bg.lineStyle(2, 0xd7bde2);
    bg.drawRoundedRect(width / 2 - 180, 0, 360, 100, 12);
    bg.endFill();

    const text = new PIXI.Text('FREE SPINS!', {
      fontFamily: 'Arial',
      fontSize: 32,
      fontWeight: 'bold',
      fill: 0xffd700,
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowDistance: 3,
    });
    text.anchor.set(0.5);
    text.x = width / 2;
    text.y = 50;

    banner.addChild(bg, text);
    return banner;
  }

  private registerHandlers(): void {
    this.unsubscribers.push(this.bus.on('BALANCE_UPDATED', (payload) => {
      this.balanceText.text = `Balance: ${payload.balance.toFixed(0)}`;
    }));

    this.unsubscribers.push(this.bus.on('SPIN_RESULT_RECEIVED', (payload) => {
      this.winText.text = `Win: ${payload.totalWin > 0 ? payload.totalWin.toFixed(0) : 0}`;
    }));

    this.unsubscribers.push(this.bus.on('REELS_STARTED', () => {
      this.setSpinEnabled(false);
      this.winText.text = 'Win: 0';
    }));

    // ROUND_COMPLETE is the single event that signals the player can act again.
    // It fires from the state machine whenever it reaches IDLE or FREE_SPINS_IDLE —
    // covering no-win rounds, win rounds (after animation), and free spins exhaustion.
    //
    // Do NOT re-enable on REELS_STOPPED: that fires before win presentation begins,
    // which would flash the button enabled mid-round and allow errant clicks.
    this.unsubscribers.push(this.bus.on('ROUND_COMPLETE', () => {
      this.setSpinEnabled(true);
    }));

    this.unsubscribers.push(this.bus.on('WIN_PRESENTATION_STARTED', () => {
      this.setSpinEnabled(false);
    }));

    this.unsubscribers.push(this.bus.on('FREE_SPINS_COUNT_UPDATED', (payload) => {
      this.setFreeSpinsCount(payload.count);
    }));
    this.unsubscribers.push(this.bus.on('FREE_SPINS_BANNER_SHOWN', (payload) => {
      this.showFreeSpinsBanner(payload.count);
    }));
    this.unsubscribers.push(this.bus.on('FREE_SPINS_BANNER_HIDDEN', () => {
      this.hideFreeSpinsBanner();
    }));
  }

  private onSpinPressed(): void {
    if (!this.isSpinEnabled) return;
    this.bus.emit({ type: 'SPIN_REQUESTED' });
  }

  private changeBet(direction: number): void {
    this.currentBetIndex = Math.max(
      0,
      Math.min(this.betOptions.length - 1, this.currentBetIndex + direction),
    );
    const newBet = this.betOptions[this.currentBetIndex];
    this.betText.text = `Bet: ${newBet}`;
    this.bus.emit({ type: 'BET_CHANGED', payload: { bet: newBet } });
  }

  setSpinEnabled(enabled: boolean): void {
    this.isSpinEnabled = enabled;
    this.spinButtonBg.alpha = enabled ? 1 : 0.4;
    this.spinButtonLabel.alpha = enabled ? 1 : 0.6;
    this.spinButton.cursor = enabled ? 'pointer' : 'default';
    if (enabled) this.drawSpinButtonBg(0x27ae60);
    else this.drawSpinButtonBg(0x555555);
  }

  setFreeSpinsCount(count: number): void {
    this.freeSpinsCountText.text = count > 0 ? `FS Left: ${count}` : '';
  }

  showFreeSpinsBanner(count: number): void {
    this.freeSpinsBanner.visible = true;
    const text = this.freeSpinsBanner.children[1] as PIXI.Text;
    text.text = `FREE SPINS x${count}!`;
  }

  hideFreeSpinsBanner(): void {
    this.freeSpinsBanner.visible = false;
  }

  setGameState(state: GameState): void {
    const canSpin = state === GameState.IDLE || state === GameState.FREE_SPINS_IDLE;
    this.setSpinEnabled(canSpin);
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.container.destroy({ children: true });
  }
}
