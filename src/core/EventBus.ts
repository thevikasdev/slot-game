import type { GameEvent, GameEventType, EventPayload } from './types';

type Handler<T extends GameEventType> = EventPayload<T> extends undefined
  ? () => void
  : (payload: EventPayload<T>) => void;

type AnyHandler = (payload?: unknown) => void;

/**
 * Typed event bus — the sole communication channel between all modules.
 *
 * Design constraint: no module holds a reference to another module.
 * All cross-module communication MUST go through this bus.
 * Direct method calls between StateMachine, ReelEngine, HUD, etc. are forbidden.
 */
export class EventBus {
  private readonly listeners = new Map<string, Set<AnyHandler>>();

  on<T extends GameEventType>(type: T, handler: Handler<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler as AnyHandler);

    return () => this.off(type, handler);
  }

  off<T extends GameEventType>(type: T, handler: Handler<T>): void {
    this.listeners.get(type)?.delete(handler as AnyHandler);
  }

  emit<T extends GameEventType>(event: Extract<GameEvent, { type: T }>): void {
    const handlers = this.listeners.get(event.type);
    if (!handlers) return;

    const payload = 'payload' in event ? event.payload : undefined;
    handlers.forEach(h => h(payload));
  }

  once<T extends GameEventType>(type: T, handler: Handler<T>): void {
    const unsub = this.on(type, ((...args: Parameters<Handler<T>>) => {
      unsub();
      (handler as (...a: unknown[]) => void)(...args);
    }) as Handler<T>);
  }
}

export const eventBus = new EventBus();
