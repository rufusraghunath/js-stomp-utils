// Type definitions for MockStompBroker
// Project: https://github.com/rufusraghunath/mock-stomp-broker
// Definitions by: Rufus Raghunath <https://github.com/rufusraghunath>

export = MockStompBroker;

interface Config {
  port?: number;
  portRange?: [number, number];
  endpoint?: string;
}

declare class MockStompBroker {
  constructor(config?: Config);

  getPort(): number;
  newSessionsConnected(): Promise<string[]>;
  subscribed(sessionId: string): Promise<void>;
  scheduleMessage(topic: string, payload: any, headers?: {}): string;
  messageSent(messageId: string): Promise<void>;
  disconnected(sessionId: string): Promise<void>;
  kill(): void;
}
