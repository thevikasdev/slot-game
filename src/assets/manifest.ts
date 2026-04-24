import * as PIXI from 'pixi.js';

/**
 * All asset bundles declared upfront in one place.
 * Load by key — never scatter Assets.load() calls across the codebase.
 *
 * When adding new assets: add a new bundle entry here, then call
 * PIXI.Assets.loadBundle('your-bundle-key') in the appropriate loader.
 */
export const ASSET_MANIFEST: PIXI.AssetsManifest = {
  bundles: [
    {
      name: 'game',
      assets: [
        // No external art assets — symbols are built procedurally via RenderTexture.
        // Add real spritesheets here when art is available:
        // { alias: 'symbols', src: '/assets/symbols.json' },
        // { alias: 'ui', src: '/assets/ui.json' },
      ],
    },
  ],
};

export async function loadGameAssets(): Promise<void> {
  await PIXI.Assets.init({ manifest: ASSET_MANIFEST });
  await PIXI.Assets.loadBundle('game');
}
