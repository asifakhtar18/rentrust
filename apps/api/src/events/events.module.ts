import { Global, Module } from '@nestjs/common';
import { EventBus } from './event-bus';

/** Global event bus so any module can publish/subscribe domain events. */
@Global()
@Module({
  providers: [EventBus],
  exports: [EventBus],
})
export class EventsModule {}
