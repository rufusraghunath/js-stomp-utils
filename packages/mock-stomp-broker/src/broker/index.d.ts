// Type definitions for MockStompBroker
// Project: MockStompBroker
// Definitions by: Rufus Raghunath https://github.com/rufusraghunath

export = MockStompBroker;

declare class MockStompBroker {
  constructor(port?: number);

  getPort(): number;
  newSessionsConnected(): Promise<string[]>;
  subscribed(sessionId: string): Promise<void>;
  sendMessageWithPayloadToTopic(topic: string, payload: any): string;
  messageSent(messageId: string): Promise<void>;
  disconnected(sessionId: string): Promise<void>;
  kill(): void;
}
