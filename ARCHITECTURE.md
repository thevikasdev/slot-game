# Slot Game Framework

## Stage Hierarchy

```text
app.stage
└── GameContainer
    ├── BackgroundLayer
    ├── ReelContainer
    │   └── Reel[0..N]
    │       └── Symbol[0..M]
    ├── WinLayer
    │   └── WinPresentation.container
    └── HUDLayer
        └── HUD.container
```

`GameContainer` builds the scene and handles teardown.

## Modules

| Module | Responsibility |
|---|---|
| `EventBus` | Event routing |
| `GameStateMachine` | Round state, balance, bet |
| `ReelEngine` | Reel instances, ticker updates, stop timing |
| `Reel` | Single reel movement and stop snap |
| `SymbolRenderer` | Shared `RenderTexture` cache |
| `WinPresentation` | Win animation |
| `FreeSpins` | Free-spin counter and auto-spin |
| `HUD` | Labels and buttons |

## Spin Flow

```text
HUD -> SPIN_REQUESTED
GameStateMachine -> REELS_STARTED
GameStateMachine -> RESULT_READY
ReelEngine -> REELS_STOPPED
GameStateMachine -> SPIN_RESULT_RECEIVED
GameStateMachine -> WIN_PRESENTATION_STARTED or ROUND_COMPLETE
```

Modules communicate through events, but `GameContainer` still wires everything together directly.

## Reel Notes

- Each reel creates `rows + BUFFER_SYMBOLS` sprites once.
- Movement is ticker-delta based.
- Recycle logic avoids per-frame `filter()` / `sort()` allocations.
- Stop timing is ticker-driven.
- Final row alignment is handled by `snapToResult()`.

The stop model is deterministic, but still simple. It slows down with an ease-out curve and then snaps
to the requested result.

## Result Source

`mockServer.ts` builds visible windows from configured `reelStrips`, not arbitrary symbol grids.

Forced scatter results are handled by picking strip positions whose top symbol is `SCATTER`.

## RenderTexture Usage

- Build symbol graphics and text once
- Render them into `PIXI.RenderTexture`
- Cache by symbol name
- Reuse across all reel sprites

Texture ownership stays in `SymbolRenderer`.

## Timing

- Reel movement: ticker `delta`
- Reel stop delay: ticker `lastTime`
- Win presentation: ticker updates
- Free-spin intro delay: ticker updates
- Mock network delay: `requestAnimationFrame`

No `PIXI.Loader`, `interactive`, `buttonMode`, `setInterval`, or animation `setTimeout`.

## Config

Driven by config:

- Reel count
- Row count
- Symbol list
- Reel strips
- Bet options
- Default bet
- Symbol size and spacing
- Spin timing
- Free-spin award size

Still hardcoded outside config:

- Initial balance
- App size

## Cleanup

`GameContainer.destroy()` tears down:

- `WinPresentation`
- `FreeSpins`
- `HUD`
- `ReelEngine`
- `GameStateMachine`

This prevents leaked ticker callbacks and event subscriptions.

## Tradeoffs

This is a framework-style take-home, not a full production slot runtime.

1. Reel stop behavior is stable, but not a full physically solved stop model.
2. `mockServer.ts` is demo outcome generation, not a real math/paytable engine.
3. Composition is centralized in `GameContainer`.
4. There is no dedicated error state or recovery flow.

## Self-Critique

The weakest part is still the reel stopping model in `Reel.updateDeceleration()` /
`Reel.snapToResult()`.

- It is correct and deterministic.
- It still uses a simple ease-out plus final snap.
- That guarantees alignment, but it does not land naturally on the target strip position.

If I kept working on it, I would:

1. Calculate the exact target strip index and distance before deceleration starts.
2. Use a stop curve derived from distance and stop duration.
3. Land on the final result window without a corrective snap.
