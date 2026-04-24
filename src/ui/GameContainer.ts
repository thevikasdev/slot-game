import * as PIXI from 'pixi.js';
import { ReelEngine } from '../engine/ReelEngine';
import { HUD } from './HUD';
import { WinPresentation } from '../features/WinPresentation';
import { FreeSpins } from '../features/FreeSpins';
import { GameStateMachine } from '../core/GameStateMachine';
import type { EventBus } from '../core/EventBus';
import type { GameConfig } from '../core/types';

export class GameContainer extends PIXI.Container {
  private readonly reelEngine: ReelEngine;
  private readonly hud: HUD;
  private readonly winPresentation: WinPresentation;
  private readonly freeSpins: FreeSpins;
  private readonly stateMachine: GameStateMachine;

  constructor(
    app: PIXI.Application,
    bus: EventBus,
    config: GameConfig,
  ) {
    super();

    const width = app.screen.width;
    const height = app.screen.height;
    const hudHeight = 100;
    const reelAreaHeight = height - hudHeight;

    const background = this.buildBackground(width, height);

    this.reelEngine = new ReelEngine(app, bus, config);
    const reelTotalWidth = this.reelEngine.getTotalWidth();
    const reelTotalHeight = this.reelEngine.getTotalHeight();

    this.reelEngine.container.x = (width - reelTotalWidth) / 2;
    this.reelEngine.container.y = (reelAreaHeight - reelTotalHeight) / 2;

    const winLayer = new PIXI.Container();
    winLayer.x = this.reelEngine.container.x;
    winLayer.y = this.reelEngine.container.y;

    this.hud = new HUD(bus, {
      width,
      betOptions: config.betOptions,
      defaultBet: config.defaultBet,
    });
    this.hud.container.y = height - hudHeight;

    this.winPresentation = new WinPresentation(
      app,
      bus,
      reelTotalWidth,
      reelTotalHeight,
    );
    winLayer.addChild(this.winPresentation.container);

    this.freeSpins = new FreeSpins(app, bus);
    this.stateMachine = new GameStateMachine(bus, 1000, config.defaultBet);

    this.addChild(background);
    this.addChild(this.reelEngine.container);
    this.addChild(winLayer);
    this.addChild(this.hud.container);
  }

  override destroy(options?: PIXI.IDestroyOptions | boolean): void {
    this.winPresentation.destroy();
    this.freeSpins.destroy();
    this.hud.destroy();
    this.reelEngine.destroy();
    this.stateMachine.destroy();
    super.destroy(options);
  }

  private buildBackground(width: number, height: number): PIXI.Graphics {
    const background = new PIXI.Graphics();

    background.beginFill(0x1a1a2e);
    background.drawRect(0, 0, width, height);
    background.endFill();

    background.lineStyle(3, 0x4a6fa5, 0.8);
    background.beginFill(0x16213e, 0.8);
    background.drawRoundedRect(20, 20, width - 40, height - 140, 16);
    background.endFill();

    return background;
  }
}
