import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { CustomerEmbeddingService } from "../services/customer-embedding.service";
import {
  EmbeddingEvents,
  type CustomerChangedEvent,
} from "../embedding-events";

/**
 * Reacts to `embeddings.customer_changed` and refreshes the customer's
 * embedding in the background. Listener is `async: true` so the producing
 * write path never blocks on OpenAI latency.
 */
@Injectable()
export class CustomerEmbeddingListener {
  private readonly logger = new Logger(CustomerEmbeddingListener.name);

  constructor(
    private readonly customerEmbeddings: CustomerEmbeddingService,
  ) {}

  @OnEvent(EmbeddingEvents.CUSTOMER_CHANGED, { async: true })
  handleCustomerChanged(event: CustomerChangedEvent): void {
    this.logger.debug(
      `Re-embedding customer ${event.customerId} (${event.reason})`,
    );
    this.customerEmbeddings.embedCustomerInBackground(event.customerId);
  }
}
