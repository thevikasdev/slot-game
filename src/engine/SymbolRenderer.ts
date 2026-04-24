import * as PIXI from 'pixi.js';

const SYMBOL_COLORS: Record<string, number> = {
  A: 0xe74c3c,
  K: 0x3498db,
  Q: 0x2ecc71,
  J: 0xf39c12,
  WILD: 0x9b59b6,
  SCATTER: 0xf1c40f,
};

const SYMBOL_BORDER_COLORS: Record<string, number> = {
  A: 0xc0392b,
  K: 0x2980b9,
  Q: 0x27ae60,
  J: 0xe67e22,
  WILD: 0x8e44ad,
  SCATTER: 0xf39c12,
};

/**
 * Builds and caches one RenderTexture per symbol type.
 * These textures are shared across all reel sprites.
 */
export class SymbolRenderer {
  private readonly cache = new Map<string, PIXI.RenderTexture>();
  private readonly size: number;

  constructor(
    private readonly renderer: PIXI.IRenderer,
    symbolSize: number,
  ) {
    this.size = symbolSize;
  }

  getTexture(symbolName: string): PIXI.RenderTexture {
    const cached = this.cache.get(symbolName);
    if (cached) return cached;

    const rt = this.createRenderTexture(symbolName);
    this.cache.set(symbolName, rt);
    return rt;
  }

  private createRenderTexture(symbolName: string): PIXI.RenderTexture {
    const rt = PIXI.RenderTexture.create({
      width: this.size,
      height: this.size,
      resolution: window.devicePixelRatio || 1,
    });

    const container = this.buildGraphics(symbolName);
    this.renderer.render(container, { renderTexture: rt });
    container.destroy({ children: true });

    return rt;
  }

  private buildGraphics(symbolName: string): PIXI.Container {
    const container = new PIXI.Container();
    const color = SYMBOL_COLORS[symbolName] ?? 0x888888;
    const borderColor = SYMBOL_BORDER_COLORS[symbolName] ?? 0x666666;
    const pad = 8;

    const bg = new PIXI.Graphics();
    bg.lineStyle(3, borderColor, 1);
    bg.beginFill(color, 1);
    bg.drawRoundedRect(pad, pad, this.size - pad * 2, this.size - pad * 2, 12);
    bg.endFill();

    if (symbolName === 'WILD') {
      this.drawStar(bg, this.size / 2, this.size / 2, 5, 30, 14, 0xffffff, 0.3);
    } else if (symbolName === 'SCATTER') {
      bg.beginFill(0xffffff, 0.2);
      bg.drawCircle(this.size / 2, this.size / 2, 28);
      bg.endFill();
    }

    const label = new PIXI.Text(symbolName, {
      fontFamily: 'Arial',
      fontSize: symbolName.length > 1 ? 18 : 32,
      fontWeight: 'bold',
      fill: 0xffffff,
      dropShadow: true,
      dropShadowDistance: 2,
      dropShadowColor: 0x000000,
      dropShadowAlpha: 0.5,
    });

    label.anchor.set(0.5);
    label.x = this.size / 2;
    label.y = this.size / 2;

    container.addChild(bg, label);
    return container;
  }

  private drawStar(
    g: PIXI.Graphics,
    cx: number,
    cy: number,
    points: number,
    outerR: number,
    innerR: number,
    color: number,
    alpha: number,
  ): void {
    g.beginFill(color, alpha);
    const step = Math.PI / points;
    g.moveTo(cx + outerR * Math.cos(-Math.PI / 2), cy + outerR * Math.sin(-Math.PI / 2));
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = i * step - Math.PI / 2;
      g.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    }
    g.closePath();
    g.endFill();
  }

  destroyAll(): void {
    this.cache.forEach(rt => rt.destroy(true));
    this.cache.clear();
  }
}
