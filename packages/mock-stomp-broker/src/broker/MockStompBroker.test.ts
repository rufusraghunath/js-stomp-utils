import MockStompBroker from "./MockStompBroker";
import { Client, Message } from "@stomp/stompjs";
import { TextEncoder, TextDecoder } from "text-encoding";

interface Global extends NodeJS.Global {
  TextEncoder: any;
  TextDecoder: any;
}

declare var global: Global;

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

describe("MockStompBroker", () => {
  interface ClientArgs {
    port: number;
    topic?: string;
    onMessage?: (message: Message) => void;
  }

  const getClient = ({ port, topic, onMessage = jest.fn() }: ClientArgs) => {
    const client = new Client({
      brokerURL: `ws://localhost:${port}/websocket`
    });

    if (topic) {
      client.onConnect = () => {
        client.subscribe(topic, onMessage);
      };
    }

    client.activate();

    return client;
  };

  let broker: MockStompBroker;
  let port: number;

  beforeEach(() => {
    broker = new MockStompBroker();
    port = broker.getPort();
  });

  afterEach(() => {
    broker.kill();
  });

  describe("startup", () => {
    it("can take a specific port", () => {
      broker = new MockStompBroker(3000);

      expect(broker.getPort()).toBe(3000);
    });

    xit("fails when port specified is already in use by another MockStompBroker instance", () => {
      // TODO
    });

    xit("can pick a random port from a specific range", () => {
      // TODO
    });

    it("falls back to a random port between 8000 and 9000", () => {
      expect(port).toBeLessThan(9000);
      expect(port).toBeGreaterThan(8000);
    });

    xit("can be configured to use ws:// or wss://", () => {
      //
    });

    xit("can be configured to take a custom websocket endpoint", () => {
      //
    });

    xit("falls back to using /websocket as the base endpoint", () => {
      //
    });
  });

  describe("interacting", () => {
    const topic = "my-topic";
    const messagePayload = { hello: "world" };
    const onMessage = jest.fn();
    const expectRejection = async (p: Promise<any>, expected: string) => {
      try {
        await p;
      } catch (e) {
        expect(e).toMatch(expected);
      }
    };
    let client: Client;

    beforeEach(() => {
      client = getClient({ topic, port, onMessage });
      onMessage.mockReset();
    });

    afterEach(() => {
      client.deactivate();
    });

    describe("newSessionsConnected", () => {
      it("rejects if there are no new sessionIds", () => {
        const unconnectedBroker = new MockStompBroker();

        expectRejection(
          unconnectedBroker.newSessionsConnected(),
          "No new sessions established"
        );

        unconnectedBroker.kill();
      });

      it("resolves to a list of new sessionIds", async () => {
        const sessionIds = await broker.newSessionsConnected();

        expect(sessionIds).toHaveLength(1);
      });

      it("does not return sessionIds that have already been queried", async () => {
        const [firstSessionId] = await broker.newSessionsConnected();
        const secondClient = getClient({ topic, port });
        const sessionIds = await broker.newSessionsConnected();

        expect(sessionIds).toHaveLength(1);
        expect(sessionIds).not.toContain(firstSessionId);

        secondClient.deactivate();
      });
    });

    describe("subscribed", () => {
      it("rejects when no subscription is made for a sessionId", async () => {
        const unsubscribedBroker = new MockStompBroker();
        const unsubscribedClient = getClient({
          port: unsubscribedBroker.getPort()
        });
        const [sessionId] = await unsubscribedBroker.newSessionsConnected();

        expectRejection(
          unsubscribedBroker.subscribed(sessionId),
          "Session never subscribed to a topic"
        );

        unsubscribedClient.deactivate();
        unsubscribedBroker.kill();
      });

      it("resolves when the first subscription is made for a sessionId", async () => {
        const [sessionId] = await broker.newSessionsConnected();

        await broker.subscribed(sessionId);
      });
    });

    describe("sendMessageWithPayloadToTopic", () => {
      it("returns a messageId for the scheduled message", async () => {
        const [sessionId] = await broker.newSessionsConnected();

        await broker.subscribed(sessionId);

        const messageId = broker.sendMessageWithPayloadToTopic(
          topic,
          messagePayload
        );

        expect(messageId).toBeDefined();
      });
    });

    describe("messageSent", () => {
      it("rejects when a message with a specific messageId has not been sent", async () => {
        const [sessionId] = await broker.newSessionsConnected();

        await broker.subscribed(sessionId);

        expectRejection(
          broker.messageSent("some-invalid-id"),
          "Message some-invalid-id was never sent"
        );
      });

      it("resolves when a message with a specific messageId has been sent", async () => {
        const [sessionId] = await broker.newSessionsConnected();

        await broker.subscribed(sessionId);

        const messageId = broker.sendMessageWithPayloadToTopic(
          topic,
          messagePayload
        );

        await broker.messageSent(messageId);
      });

      it("message and payload should have been sent to subscribers", async () => {
        const [sessionId] = await broker.newSessionsConnected();

        await broker.subscribed(sessionId);

        const messageId = broker.sendMessageWithPayloadToTopic(
          topic,
          messagePayload
        );

        expect(onMessage).not.toHaveBeenCalled();

        await broker.messageSent(messageId);

        expect(onMessage).toHaveBeenCalledTimes(1);

        const message = onMessage.mock.calls[0][0];

        expect(message).toMatchObject({
          body: JSON.stringify(messagePayload),
          command: "MESSAGE",
          headers: {
            mockMessageId: messageId,
            "content-length": "17",
            "content-type": "application/json;charset=UTF-8"
          }
        });
      });
    });

    describe("disconnected", () => {
      it("rejects when a session with a specific sessionId doesn't close", async () => {
        const [sessionId] = await broker.newSessionsConnected();

        expectRejection(
          broker.disconnected(sessionId),
          "Session never disconnected"
        );
      });

      it("resolves when a session with a specific sessionId is closed", async () => {
        const [sessionId] = await broker.newSessionsConnected();

        client.deactivate();

        await broker.disconnected(sessionId);
      });
    });

    describe("kill", () => {
      it("should bring down the server and prevent further interaction", () => {
        broker.kill();

        expectRejection(
          broker.newSessionsConnected(),
          "No new sessions established"
        );
      });

      xit("should free up port for use", () => {
        // TODO: make this work

        try {
          new MockStompBroker(port);
        } catch (e) {
          expect(e).toBe("asd");
        }

        broker.kill();

        new MockStompBroker(port);
      });
    });
  });
});
