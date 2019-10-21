import { Client } from "@stomp/stompjs";
import { TextEncoder, TextDecoder } from "text-encoding";
import MockStompBroker from "./MockStompBroker";
import getStompClient from "../util/getStompClient";

interface Global extends NodeJS.Global {
  TextEncoder: any;
  TextDecoder: any;
}

declare var global: Global;

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

describe("MockStompBroker", () => {
  const topic = "my-topic";
  const expectRejection = async (p: Promise<any>, expected: string) => {
    try {
      await p;
    } catch (e) {
      expect(e).toMatch(expected);
    }
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
      broker = new MockStompBroker({ port: 3000 });

      expect(broker.getPort()).toBe(3000);
    });

    it("can pick a random port from a specific range", () => {
      broker = new MockStompBroker({ portRange: [5000, 5010] });
      port = broker.getPort();

      expect(port).toBeLessThan(5010);
      expect(port).toBeGreaterThanOrEqual(5000);
    });

    it("falls back to a random port between 8000 and 9000", () => {
      expect(port).toBeLessThan(9000);
      expect(port).toBeGreaterThanOrEqual(8000);
    });

    it("can be configured to take a custom websocket endpoint", async () => {
      const endpoint = "/my-endpoint";
      const customPathBroker = new MockStompBroker({ endpoint });
      const nonMatchingClient = getStompClient({
        port: customPathBroker.getPort(),
        topic,
        endpoint: "/some-other-endpoint"
      });

      expectRejection(
        customPathBroker.newSessionsConnected(),
        "No new sessions established"
      );

      const matchingClient = getStompClient({
        port: customPathBroker.getPort(),
        topic,
        endpoint
      });

      await customPathBroker.newSessionsConnected();

      nonMatchingClient.deactivate();
      matchingClient.deactivate();
      customPathBroker.kill();
    });

    it("falls back to using /websocket as the base endpoint", async () => {
      const client = getStompClient({
        port,
        topic,
        endpoint: "/websocket"
      });

      await broker.newSessionsConnected();

      client.deactivate();
      broker.kill();
    });
  });

  describe("interacting", () => {
    const messagePayload = { hello: "world" };
    let client: Client;

    beforeEach(() => {
      client = getStompClient({ topic, port });
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
        const secondClient = getStompClient({ topic, port });
        const sessionIds = await broker.newSessionsConnected();

        expect(sessionIds).toHaveLength(1);
        expect(sessionIds).not.toContain(firstSessionId);

        secondClient.deactivate();
      });
    });

    describe("subscribed", () => {
      it("rejects when no subscription is made for a sessionId", async () => {
        const unsubscribedBroker = new MockStompBroker();
        const unsubscribedClient = getStompClient({
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

    describe("scheduleMessage", () => {
      it("returns a messageId for the scheduled message", async () => {
        const [sessionId] = await broker.newSessionsConnected();

        await broker.subscribed(sessionId);

        const messageId = broker.scheduleMessage(topic, messagePayload);

        expect(messageId).toBeDefined();
      });

      it("results in async message with custom payload", async () => {
        const onMessage = jest.fn();
        const broker = new MockStompBroker();
        const client = getStompClient({
          port: broker.getPort(),
          topic,
          onMessage
        });

        const [sessionId] = await broker.newSessionsConnected();

        await broker.subscribed(sessionId);

        const messageId = broker.scheduleMessage(topic, messagePayload);

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

        client.deactivate();
        broker.kill();
      });

      it("allows customizing headers", async () => {
        const onMessage = jest.fn();
        const broker = new MockStompBroker();
        const client = getStompClient({
          port: broker.getPort(),
          topic,
          onMessage
        });
        const headers = {
          "content-type": "text/plain",
          "X-Custom-Header": "Hello, world",
          mockMessageId: "This will be overriden by the broker"
        };
        const [sessionId] = await broker.newSessionsConnected();

        await broker.subscribed(sessionId);

        const messageId = broker.scheduleMessage(
          topic,
          messagePayload,
          headers
        );

        await broker.messageSent(messageId);

        const message = onMessage.mock.calls[0][0];

        expect(message).toMatchObject({
          headers: {
            "content-type": "text/plain",
            "X-Custom-Header": "Hello, world",
            mockMessageId: messageId
          }
        });

        client.deactivate();
        broker.kill();
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

        const messageId = broker.scheduleMessage(topic, messagePayload);

        await broker.messageSent(messageId);
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
          new MockStompBroker({ port });
        } catch (e) {
          expect(e).toBe("asd");
        }

        broker.kill();

        new MockStompBroker({ port });
      });
    });
  });
});
