# Slot Game Framework

Small PixiJS v7 slot game framework built as a take-home assignment.

## Stack

- PixiJS v7
- TypeScript
- Vite

## Run

```bash
npm install
npm run dev
```

## Included

- Config-driven reel setup via `src/config/gameConfig.json`
- Reel engine with spin, deceleration, snap stop, and symbol recycling
- Typed mock spin result flow
- Event-driven state machine
- Free spins feature
- Win presentation and HUD
- RenderTexture-based symbol generation

## Project Files

- `ARCHITECTURE.md` - architecture notes, tradeoffs, and self-critique
- `JUNIOR_DEV_GUIDE.md` - onboarding and extension notes
- `src/config/gameConfig.json` - main game configuration

## Notes

- Symbols are generated procedurally with `PIXI.Graphics` and `PIXI.Text`, then rendered once into shared `RenderTexture` objects.
- Reel count, rows, strips, bet options, and timing values are driven by config.
- Feature modules communicate through the event bus.
