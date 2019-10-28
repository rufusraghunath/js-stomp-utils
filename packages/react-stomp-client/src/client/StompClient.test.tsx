import { mount } from "enzyme";
import React from "react";
import MockStompBroker from "../../../mock-stomp-broker/src/broker/MockStompBroker";
import StompClient from "./StompClient";

// TODO: add test coverage gate
describe("StompClient", () => {
  const topic = "my-topic";
  const headers = {
    "X-Custom-Header": "My-Header"
  };
  const message = { data: { id: "my-id", name: "my-name" } };
  const onMessageMock = jest.fn();
  let server: MockStompBroker;

  beforeEach(() => {
    server = new MockStompBroker();
    onMessageMock.mockReset();
  });

  afterEach(() => {
    server.kill();
  });

  it("should render its children", () => {
    const wrapper = mount(
      <StompClient port={server.getPort()} topic={topic} onMessage={() => {}}>
        <div>Hello, STOMP</div>
      </StompClient>
    );

    expect(wrapper.text()).toBe("Hello, STOMP");
  });

  it("should automatically try to reconnect when connection to server failed", async () => {
    const port = server.getPort();

    server.kill();
    // TODO: may have to add a test to prove that the client reconnects when an existing connection is severed
    // (as opposed to failing to establishing a connection in the first place).
    // Seeing some behavior that indicates we may have to handroll such reconnection logic.

    mount(
      <StompClient port={port} topic={topic} onMessage={() => {}}>
        <div>Hello, STOMP</div>
      </StompClient>
    );

    server = new MockStompBroker({ port });

    await server.newSessionsConnected();
  });

  it("should not try to subscribe when no topic is provided on first mount", async done => {
    mount(
      <StompClient port={server.getPort()}>
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
      <StompClient
        port={server.getPort()}
        topic={topic}
        onMessage={onMessageMock}
      >
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
      <StompClient
        port={server.getPort()}
        topic={topic}
        onMessage={onMessageMock}
      >
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
      <StompClient
        port={server.getPort()}
        topic={topic}
        onMessage={onMessageMock}
      >
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
      <StompClient
        port={server.getPort()}
        topic={topic}
        onMessage={onMessageMock}
      >
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
