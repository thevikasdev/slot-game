import * as PIXI from 'pixi.js';
import type { SymbolRenderer } from './SymbolRenderer';

export enum ReelState {
  IDLE = 'IDLE',
  SPINNING = 'SPINNING',
  DECELERATING = 'DECELERATING',
  STOPPED = 'STOPPED',
}

interface SymbolSlot {
  sprite: PIXI.Sprite;
  stripIndex: number;
}

const BASE_SPEED_PPS = 1800;
const PIXELS_PER_FRAME_AT_60 = BASE_SPEED_PPS / 60;

export class Reel {
  readonly container: PIXI.Container;

  private readonly slots: SymbolSlot[] = [];
  private readonly sortedSlots: SymbolSlot[] = [];
  private readonly mask: PIXI.Graphics;
  private readonly symbolSize: number;
  private readonly rows: number;
  private readonly strip: number[];
  private readonly symbols: string[];

  private state: ReelState = ReelState.IDLE;
  private currentStripIndex = 0;
  private targetSymbols: number[] = [];
  private decelerationTime = 0;
  private readonly decelerationDuration: number;
  private onStoppedCallback?: () => void;

  private static readonly BUFFER_SYMBOLS = 2;

  constructor(
    private readonly symbolRenderer: SymbolRenderer,
    strip: number[],
    symbols: string[],
    symbolSize: number,
    rows: number,
    decelerationDuration: number,
  ) {
    this.strip = strip;
    this.symbols = symbols;
    this.symbolSize = symbolSize;
    this.rows = rows;
    this.decelerationDuration = decelerationDuration;

    this.container = new PIXI.Container();
    this.mask = this.createMask();
    this.container.mask = this.mask;
    this.container.addChild(this.mask);

    this.buildSymbolPool();
    this.layoutSymbolsAtRest();
  }

  getState(): ReelState {
    return this.state;
  }

  spin(): void {
    if (this.state === ReelState.SPINNING) {
      return;
    }

    this.state = ReelState.SPINNING;
    this.decelerationTime = 0;
  }

  stop(targetSymbolIndices: number[], onStopped: () => void): void {
    if (this.state !== ReelState.SPINNING) {
      return;
    }

    this.targetSymbols = targetSymbolIndices;
    this.onStoppedCallback = onStopped;
    this.state = ReelState.DECELERATING;
    this.decelerationTime = 0;
  }

  update(delta: number): void {
    if (this.state === ReelState.IDLE || this.state === ReelState.STOPPED) {
      return;
    }

    if (this.state === ReelState.SPINNING) {
      this.moveSymbols(PIXELS_PER_FRAME_AT_60 * delta);
      return;
    }

    this.updateDeceleration(delta);
  }

  highlightSymbol(row: number, color = 0xffdd00): void {
    const targetY = row * this.symbolSize;
    for (const slot of this.slots) {
      if (Math.abs(slot.sprite.y - targetY) < 0.01) {
        slot.sprite.tint = color;
        return;
      }
    }
  }

  clearHighlights(): void {
    for (const slot of this.slots) {
      slot.sprite.tint = 0xffffff;
    }
  }

  reset(): void {
    this.state = ReelState.IDLE;
    this.clearHighlights();
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  private createMask(): PIXI.Graphics {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xffffff);
    graphics.drawRect(0, 0, this.symbolSize, this.symbolSize * this.rows);
    graphics.endFill();
    return graphics;
  }

  private buildSymbolPool(): void {
    const totalSlots = this.rows + Reel.BUFFER_SYMBOLS;

    for (let i = 0; i < totalSlots; i++) {
      const stripIdx = ((this.currentStripIndex - i) % this.strip.length + this.strip.length) % this.strip.length;
      const symbolName = this.symbols[this.strip[stripIdx]];
      const sprite = new PIXI.Sprite(this.symbolRenderer.getTexture(symbolName));
      const slot: SymbolSlot = { sprite, stripIndex: stripIdx };

      this.slots.push(slot);
      this.sortedSlots.push(slot);
      this.container.addChild(sprite);
    }
  }

  private layoutSymbolsAtRest(): void {
    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i].sprite.y = (i - Reel.BUFFER_SYMBOLS) * this.symbolSize;
    }
  }

  private moveSymbols(pixelsDelta: number): void {
    for (const slot of this.slots) {
      slot.sprite.y += pixelsDelta;
    }

    this.recycleSymbols();
  }

  private recycleSymbols(): void {
    const visibleBottom = this.symbolSize * this.rows;

    while (true) {
      let overflowSlot: SymbolSlot | null = null;
      let highestY = -Infinity;

      for (const slot of this.slots) {
        if (slot.sprite.y >= visibleBottom && slot.sprite.y > highestY) {
          overflowSlot = slot;
          highestY = slot.sprite.y;
        }
      }

      if (!overflowSlot) {
        return;
      }

      const topMostY = this.getTopMostY();
      overflowSlot.sprite.y = topMostY - this.symbolSize;

      this.currentStripIndex = (this.currentStripIndex - 1 + this.strip.length) % this.strip.length;
      overflowSlot.stripIndex = this.currentStripIndex;
      overflowSlot.sprite.texture = this.symbolRenderer.getTexture(this.symbols[this.strip[this.currentStripIndex]]);
      overflowSlot.sprite.tint = 0xffffff;
    }
  }

  private getTopMostY(): number {
    let min = Infinity;
    for (const slot of this.slots) {
      if (slot.sprite.y < min) {
        min = slot.sprite.y;
      }
    }
    return min;
  }

  private updateDeceleration(delta: number): void {
    this.decelerationTime += delta / 60;
    const t = Math.min(this.decelerationTime / this.decelerationDuration, 1);
    const eased = 1 - t * t;
    const currentSpeed = PIXELS_PER_FRAME_AT_60 * eased;

    if (t >= 1 || currentSpeed < 0.5) {
      this.snapToResult();
      return;
    }

    this.moveSymbols(currentSpeed * delta);
  }

  private snapToResult(): void {
    this.state = ReelState.STOPPED;
    this.sortSlotsByY();

    for (let i = 0; i < this.sortedSlots.length; i++) {
      const slot = this.sortedSlots[i];
      const rowIndex = i - Reel.BUFFER_SYMBOLS;
      slot.sprite.y = rowIndex * this.symbolSize;

      if (rowIndex >= 0) {
        const symbolIndex = this.targetSymbols[rowIndex] ?? 0;
        slot.sprite.texture = this.symbolRenderer.getTexture(this.symbols[symbolIndex]);
        slot.sprite.tint = 0xffffff;
      }
    }

    this.currentStripIndex = this.findStripPositionForSymbols(this.targetSymbols);
    this.onStoppedCallback?.();
    this.onStoppedCallback = undefined;
  }

  private findStripPositionForSymbols(targetSymbols: number[]): number {
    const len = this.strip.length;

    for (let pos = 0; pos < len; pos++) {
      let match = true;
      for (let row = 0; row < targetSymbols.length; row++) {
        if (this.strip[(pos + row) % len] !== targetSymbols[row]) {
          match = false;
          break;
        }
      }
      if (match) {
        return pos;
      }
    }

    for (let pos = 0; pos < len; pos++) {
      if (this.strip[pos] === targetSymbols[0]) {
        return pos;
      }
    }

    return 0;
  }

  private sortSlotsByY(): void {
    this.sortedSlots.sort((a, b) => a.sprite.y - b.sprite.y);
  }
}
