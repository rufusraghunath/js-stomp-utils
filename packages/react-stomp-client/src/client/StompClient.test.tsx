import { mount } from "enzyme";
import React from "react";
import MockStompBroker from "../../../mock-stomp-broker/src/broker/MockStompBroker";
import StompClient from "./StompClient";

describe("StompClient", () => {
  const topic = "my-topic";
  const headers = {
    "X-Custom-Header": "My-Header"
  };
  const message = { data: { id: "my-id", name: "my-name" } };
  const onMessageMock = jest.fn();
  const getEndpoint = (port: number) => `ws://localhost:${port}/websocket`;
  let server: MockStompBroker;
  let endpoint: string;

  beforeEach(() => {
    server = new MockStompBroker();
    endpoint = getEndpoint(server.getPort());
    onMessageMock.mockReset();
  });

  afterEach(() => {
    server.kill();
  });

  it("should render its children", () => {
    const wrapper = mount(
      <StompClient endpoint={endpoint} topic={topic} onMessage={() => {}}>
        <div>Hello, STOMP</div>
      </StompClient>
    );

    expect(wrapper.text()).toBe("Hello, STOMP");
  });

  it("should automatically try to reconnect when connection to server failed", async () => {
    const port = server.getPort();

    server.kill();

    mount(
      <StompClient endpoint={endpoint} topic={topic} onMessage={() => {}}>
        <div>Hello, STOMP</div>
      </StompClient>
    );

    server = new MockStompBroker({ port });

    await server.newSessionsConnected();
  });

  it("should not try to subscribe when no topic is provided on first mount", async done => {
    mount(
      <StompClient endpoint={endpoint}>
        <div>Hello, STOMP</div>
      </StompClient>
    );

    const [sessionId] = await server.newSessionsConnected();

    await server.subscribed(sessionId).catch(e => {
      expect(e).toBe(`Session ${sessionId} never subscribed to a topic`);
      done();
    });
  });

  it("should not try to create new subscription when topic is removed", async done => {
    const wrapper = mount(
      <StompClient endpoint={endpoint} topic={topic} onMessage={onMessageMock}>
        <div>Hello, STOMP</div>
      </StompClient>
    );

    const [firstSessionId] = await server.newSessionsConnected();

    await server.subscribed(firstSessionId);

    wrapper.setProps({ topic: undefined });

    await server.disconnected(firstSessionId);

    const [secondSessionId] = await server.newSessionsConnected();

    await server.subscribed(secondSessionId).catch(e => {
      expect(e).toBe(`Session ${secondSessionId} never subscribed to a topic`);
      done();
    });
  });

  it("should call onMessage fn when message received", async () => {
    mount(
      <StompClient endpoint={endpoint} topic={topic} onMessage={onMessageMock}>
        <div>Hello, STOMP</div>
      </StompClient>
    );

    const [sessionId] = await server.newSessionsConnected();

    await server.subscribed(sessionId);

    const messageId = server.scheduleMessage(topic, message, headers);

    await server.messageSent(messageId);

    const receivedMessage = onMessageMock.mock.calls[0][0];

    expect(receivedMessage).toMatchObject({
      headers,
      body: JSON.stringify(message)
    });
  });

  it("should sever STOMP connection when component is unmounted", async () => {
    const wrapper = mount(
      <StompClient endpoint={endpoint} topic={topic} onMessage={onMessageMock}>
        <div>Hello, STOMP</div>
      </StompClient>
    );

    const [sessionId] = await server.newSessionsConnected();

    await server.subscribed(sessionId);

    wrapper.unmount();

    await server.disconnected(sessionId);

    const messageId = server.scheduleMessage(topic, message, headers);

    await server.messageSent(messageId);

    expect(onMessageMock).not.toBeCalledWith(message);
  });

  it("should kill old STOMP connection and open new one when topic changes", async () => {
    const wrapper = mount(
      <StompClient endpoint={endpoint} topic={topic} onMessage={onMessageMock}>
        <div>Hello, STOMP</div>
      </StompClient>
    );

    const [firstSessionId] = await server.newSessionsConnected();

    await server.subscribed(firstSessionId);

    wrapper.setProps({ topic: "NEW-TOPIC" });

    await server.disconnected(firstSessionId);

    const [secondSessionId] = await server.newSessionsConnected();

    await server.subscribed(secondSessionId);

    const messageId = server.scheduleMessage("NEW-TOPIC", message, headers);

    await server.messageSent(messageId);

    const receivedMessage = onMessageMock.mock.calls[0][0];

    expect(receivedMessage).toMatchObject({
      headers,
      body: JSON.stringify(message)
    });
  });
});
