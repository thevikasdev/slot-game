# Junior Developer Guide

## Notes

Main rule: modules communicate through the `EventBus` at feature boundaries.

`GameContainer` is the one place where concrete objects are wired together.

## Structure

There are three main layers:

1. `GameStateMachine` decides whether a round can start and what state comes next.
2. `ReelEngine` and `Reel` handle visual spin and stop behavior.
3. Feature and UI modules react to events.

## Spin Flow

```ts
HUD -> SPIN_REQUESTED
GameStateMachine -> REELS_STARTED
GameStateMachine -> RESULT_READY
ReelEngine -> REELS_STOPPED
GameStateMachine -> SPIN_RESULT_RECEIVED
GameStateMachine -> WIN_PRESENTATION_STARTED or ROUND_COMPLETE
```

Do not emit `SPIN_RESULT_RECEIVED` from UI or reel code.

## PixiJS v7 Rules

1. Use `PIXI.Assets`, not `PIXI.Loader`
2. Use `eventMode`, not `interactive` or `buttonMode`
3. Use ticker-driven animation, not `setInterval`
4. Treat ticker `delta` as a frame multiplier

```ts
app.ticker.add((delta) => {
  sprite.y += 30 * delta;
});
```

If you need seconds, use `delta / 60`.

## Texture Ownership

`SymbolRenderer` owns shared `RenderTexture` instances.

Wrong:

```ts
sprite.texture.destroy();
container.destroy({ children: true, texture: true });
```

Correct:

```ts
container.destroy({ children: true, texture: false });
```

## Reel Rules

1. Avoid allocations in the per-frame reel loop.
2. Keep results compatible with configured `reelStrips`.
3. Keep stop timing ticker-driven.
4. Keep final row alignment deterministic.

## Free Spins

Free spins are split between the state machine and the `FreeSpins` feature.

- The state machine owns legal states.
- `FreeSpins` owns the remaining-count flow and auto-trigger behavior.
- HUD updates for free spins go through events.

Avoid direct `FreeSpins -> HUD` coupling.

## Cleanup

If you add:

- `bus.on(...)`
- `app.ticker.add(...)`

also add:

- an unsubscribe path
- a `destroy()` cleanup path if the object has a lifecycle

## Adding a New Symbol

1. Add the symbol name to `src/config/gameConfig.json`
2. Use the new symbol index inside `reelStrips`
3. Add colors in `src/engine/SymbolRenderer.ts`

## Before Commit

1. `cmd /c npm.cmd run typecheck`
2. Make sure docs still match code
3. Remove stale comments when behavior changes
