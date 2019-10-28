# [MockStompBroker](https://www.npmjs.com/package/mock-stomp-broker)

A Node-based mock STOMP message broker with hooks for easy testing of your STOMP clients. Supports TypeScript.

## Installing

`npm install --save-dev mock-stomp-broker`

## Usage example

```jsx
import MockStompBroker from "mock-stomp-broker";
import MyUpdateableTable from "./MyUpdateableTable";

describe("MyUpdateableTable", () => {
  it("should add rows to the table when row data is pushed via STOMP", async () => {
    const broker = new MockStompBroker();
    const rowData = {
      id: 1,
      name: "Jane Doe"
    };
    const wrapper = mount(
      <MyUpdateableTable websocketPort={broker.getPort()} rows={[]} />
    );

    expect(wrapper.text()).not.toContain(rowData.name);

    const [sessionId] = await broker.newSessionsConnected();

    await broker.subscribed(sessionId);

    const messageId = broker.scheduleMessage(`topics/my-topic`, rowData);

    await broker.messageSent(messageId);

    expect(wrapper.text()).toContain(rowData.name);

    broker.kill();
  });

  it("should clean up the websocket connection when table is unmounted", async () => {
    const broker = new MockStompBroker();
    const wrapper = mount(
      <MyUpdateableTable websocketPort={broker.getPort()} rows={[]} />
    );

    const [sessionId] = await broker.newSessionsConnected();

    wrapper.unmount();

    await broker.disconnected(sessionId);

    broker.kill();
  });
});
```

## Config

The [`MockStompBroker`](src/broker/MockStompBroker.ts) can take a config object as a constructor arg. The config object and all its fields are optional.

| Field       | Default        | Effect                                                                                                                                                                                             |
| ----------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `port`      | N/A            | Sets a specific port for the broker to start up on. Overrides `portRange`.                                                                                                                         |
| `portRange` | `[8000, 9001]` | When provided, the broker will choose a random port number in the provided range to start up on (useful when running multiple tests in parallel). Will only take effect if `port` is not provided. |
| `endpoint`  | `/websocket`   | Sets the websocket endpoint exposed by the broker. This is where your clients should connect.                                                                                                      |

## Methods

| Method                 | Args               | Returns             | Effect                                                                                                                                                                                                                                       |
| ---------------------- | ------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getPort`              | N/A                | `number`            | Returns the broker's port. Use this to point your client(s) at the right port when generating random ports (either with `portRange` or the default behavior).                                                                                |
| `newSessionsConnected` | N/A                | `Promise<string[]>` | Resolves to an array of session IDs for sessions that were created since the last time you called this method. Rejects after 2000ms.                                                                                                         |
| `subscribed`           | `string`           | `Promise<void>`     | Resolves when a STOMP subscription has been established for the given session ID. Use this to ensure a session has an active subscription before trying to send messages. Rejects after 2000ms.                                              |
| `scheduleMessage`      | `string, any, {}?` | `string`            | Schedule a STOMP message with a given payload to be asynchronously sent by the broker to all subscribers to a given topic. Can customize the message headers in the optional third argument. Returns a message ID for the scheduled message. |
| `messageSent`          | `string`           | `Promise<void>`     | Resolves when a scheduled STOMP message with a given message ID has been sent by the broker. Use this to ensure message delivery to your clients before asserting on the outcome of receiving a message. Rejects after 2000ms.               |
| `disconnected`         | `string`           | `Promise<void>`     | Resolves when a session with a given session ID has disconnected. Use this to test your client cleanup logic. Rejects after 2000ms.                                                                                                          |
| `kill`                 | N/A                | `void`              | Shut down the broker. You'll want to call this after every test case (or in an `afterEach`) to ensure your ports are cleaned up.                                                                                                             |
