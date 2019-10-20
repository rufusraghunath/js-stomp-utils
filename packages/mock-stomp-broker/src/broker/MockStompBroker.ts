import uuid from "uuid/v4";
import http, { Server } from "http";
import StompServer from "stomp-broker-js";
import waitUntil from "../util/waitUntil";

type CallNextMiddleWare = () => boolean;
type MiddlewareStrategy = [
  string,
  (args: { sessionId: string; frame: Frame }) => void
];

interface Socket {
  sessionId: string;
}

interface MiddlewareArgs {
  frame: Frame;
}

interface Frame {
  headers: {
    mockMessageId: string;
  };
}

interface Session {
  sessionId: string;
  hasConnected: boolean;
  hasReceivedSubscription: boolean;
  hasSentMessage: boolean;
  hasDisconnected: boolean;
}

interface Sessions {
  [sessionId: string]: Session;
}

interface OptionalConfig {
  port?: number;
  portRange?: [number, number];
  endpoint?: string;
}

class MockStompBroker {
  private static PORTS_IN_USE: number[] = [];
  private static BASE_SESSION = {
    hasConnected: false,
    hasReceivedSubscription: false,
    hasSentMessage: false,
    hasDisconnected: false
  };

  private static getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  private static getPort(): number {
    const min = 8000; // inclusive TODO: make configurable
    const max = 9001; // exclusive TODO: make configurable
    const port = this.getRandomInt(min, max);

    // TODO: add try/catch on EADDRINUSE

    return this.PORTS_IN_USE.includes(port) ? this.getPort() : port;
  }

  private readonly port: number;
  private readonly httpServer: Server;
  private readonly stompServer: any;
  private readonly sentMessageIds: string[] = [];
  private queriedSessionIds: string[] = [];
  private sessions: Sessions = {};

  constructor({ port, endpoint = "/websocket" }: OptionalConfig = {}) {
    this.thereAreNewSessions = this.thereAreNewSessions.bind(this);
    this.registerMiddlewares = this.registerMiddlewares.bind(this);
    this.setMiddleware = this.setMiddleware.bind(this);

    this.port = port || MockStompBroker.getPort();
    this.httpServer = http.createServer();
    this.stompServer = new StompServer({
      server: this.httpServer,
      path: endpoint
    });

    this.registerMiddlewares();
    this.httpServer.listen(this.port);
  }

  // TODO: rename to newSession - this can never return more than one!
  public async newSessionsConnected(): Promise<string[]> {
    await waitUntil(this.thereAreNewSessions, "No new sessions established");

    const newSessionsIds = Object.values(this.sessions)
      .filter(({ sessionId }) => !this.queriedSessionIds.includes(sessionId))
      .filter(({ hasConnected }) => hasConnected)
      .map(({ sessionId }) => sessionId);

    this.queriedSessionIds = this.queriedSessionIds.concat(newSessionsIds);

    return newSessionsIds;
  }

  public subscribed(sessionId: string) {
    return waitUntil(() => {
      const session = this.sessions[sessionId];
      return Boolean(session && session.hasReceivedSubscription);
    }, `Session ${sessionId} never subscribed to a topic`);
  }

  // TODO: rename to scheduleMessage
  public sendMessageWithPayloadToTopic(topic: string, payload: {}): string {
    const body = JSON.stringify(payload);
    const mockMessageId = uuid();
    this.stompServer.send(
      `/${topic}`,
      { "content-type": "application/json;charset=UTF-8", mockMessageId }, // TODO: make configurable
      body
    );

    return mockMessageId;
  }

  public messageSent(messageId: string) {
    return waitUntil(
      () => this.sentMessageIds.includes(messageId),
      `Message ${messageId} was never sent`
    );
  }

  public disconnected(sessionId: string) {
    return waitUntil(() => {
      const session = this.sessions[sessionId];

      return Boolean(session && session.hasDisconnected);
    }, `Session ${sessionId} never disconnected`);
  }

  public kill() {
    this.httpServer.close();
  }

  public getPort() {
    return this.port;
  }

  private thereAreNewSessions(): boolean {
    const numberOfSessions = Object.entries(this.sessions).length;
    const numberOfSessionsQueried = this.queriedSessionIds.length;

    return numberOfSessions - numberOfSessionsQueried > 0;
  }

  private setMiddleware([event, middlewareHook]: MiddlewareStrategy) {
    this.stompServer.setMiddleware(
      event,
      (socket: Socket, args: MiddlewareArgs, next: CallNextMiddleWare) => {
        process.nextTick(() =>
          middlewareHook({ sessionId: socket.sessionId, frame: args.frame })
        );

        return next();
      }
    );
  }

  private registerMiddlewares() {
    const strategies: MiddlewareStrategy[] = [
      [
        "connect",
        ({ sessionId }) =>
          (this.sessions[sessionId] = {
            ...MockStompBroker.BASE_SESSION,
            sessionId,
            hasConnected: true
          })
      ],
      [
        "subscribe",
        ({ sessionId }) =>
          (this.sessions[sessionId].hasReceivedSubscription = true)
      ],
      [
        "send",
        ({ frame }) => this.sentMessageIds.push(frame.headers.mockMessageId)
      ],
      [
        "disconnect",
        ({ sessionId }) => (this.sessions[sessionId].hasDisconnected = true)
      ]
    ];

    strategies.forEach(this.setMiddleware);
  }
}

export default MockStompBroker;
