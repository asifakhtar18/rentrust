import { Injectable, Logger } from '@nestjs/common';
import { DomainEventName, DomainEventPayloads } from './events';

type Handler<E extends DomainEventName> = (payload: DomainEventPayloads[E]) => void | Promise<void>;

/**
 * Minimal in-process event bus. Chosen over Kafka for the MVP (ADR-005):
 * durable async work goes through BullMQ; this bus is just the fan-out seam so
 * producers (e.g. "review published") don't import consumers (e.g. the score
 * recalculation enqueuer). Handler errors are isolated and logged so one bad
 * listener can't break the publisher.
 */
@Injectable()
export class EventBus {
  private readonly logger = new Logger(EventBus.name);
  private readonly handlers = new Map<DomainEventName, Array<Handler<DomainEventName>>>();

  on<E extends DomainEventName>(event: E, handler: Handler<E>): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler as Handler<DomainEventName>);
    this.handlers.set(event, list);
  }

  async emit<E extends DomainEventName>(event: E, payload: DomainEventPayloads[E]): Promise<void> {
    const list = this.handlers.get(event);
    if (!list || list.length === 0) {
      return;
    }
    await Promise.all(
      list.map(async (handler) => {
        try {
          await handler(payload);
        } catch (err) {
          this.logger.error({ err, event }, `Event handler failed for ${event}`);
        }
      }),
    );
  }
}
