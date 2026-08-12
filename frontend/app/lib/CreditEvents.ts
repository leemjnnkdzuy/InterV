import "server-only";

import { EventEmitter } from "node:events";

export interface CreditUpdatedEvent {
  userId: string;
  balance: number;
  delta: number;
  reason?: string;
  referenceId?: string;
}

const globalForCreditEvents = globalThis as typeof globalThis & {
  __intervCreditEvents?: EventEmitter;
};

const creditEvents =
  globalForCreditEvents.__intervCreditEvents ?? new EventEmitter();

creditEvents.setMaxListeners(0);
globalForCreditEvents.__intervCreditEvents = creditEvents;

export function publishCreditUpdated(event: CreditUpdatedEvent): void {
  creditEvents.emit(`credit:${event.userId}`, event);
}

export function subscribeCreditUpdated(
  userId: string,
  listener: (event: CreditUpdatedEvent) => void
): () => void {
  const eventName = `credit:${userId}`;
  creditEvents.on(eventName, listener);
  return () => creditEvents.off(eventName, listener);
}
