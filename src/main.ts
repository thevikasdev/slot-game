import * as PIXI from 'pixi.js';
import { GameContainer } from './ui/GameContainer';
import { eventBus } from './core/EventBus';
import { loadGameAssets } from './assets/manifest';
import gameConfig from './config/gameConfig.json';
import type { GameConfig } from './core/types';

async function bootstrap(): Promise<void> {
  const app = new PIXI.Application({
    width: 900,
    height: 700,
    backgroundColor: 0x1a1a2e,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  document.body.appendChild(app.view as HTMLCanvasElement);

  await loadGameAssets();

  const config = gameConfig as GameConfig;

  const gameContainer = new GameContainer(app, eventBus, config);
  app.stage.addChild(gameContainer);
}

bootstrap().catch(console.error);
