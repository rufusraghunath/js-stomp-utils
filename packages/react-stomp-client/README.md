# [ReactStompClient](https://www.npmjs.com/package/react-stomp-client)

A simple STOMP message client for React. It will connect to the provided `endpoint` on mount, followed immmediately by a subscription to the provided `topic`. The connection gets cleaned up on unmount.

Easily testable via [`mock-stomp-broker`](https://www.npmjs.com/package/mock-stomp-broker)!

Supports TypeScript.

## Installing

`npm install --save react-stomp-client`

## Usage example

```jsx
import React, { Component } from "react";
import StompClient from "react-stomp-client";

class MyComponent extends Component {
  constructor(props) {
    this.state = {
      latestMessage: null
    };

    this.handleMessage = this.handleMessage.bind(this);
  }

  handleMessage(stompMessage) {
    this.setState({
      latestMessage: stompMessage
    });
  }

  render() {
    const { latestMessage } = this.state;
    return (
      <StompClient
        endpoint="ws://localhost:8888/websocket"
        topic="my-topic"
        onMessage={this.handleMessage}
      >
        <div>
          {latestMessage
            ? `Latest message received: ${latestMessage}`
            : "No message received yet"}
        </div>
      </StompClient>
    );
  }
}
```

## Props

| Prop                | Required? | Description                                                                                                                                     |
| ------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `endpoint`          | Yes       | The STOMP endpoint to connect to. The server should be up and ready to speak STOMP via WebSocket (the protocol should be either `ws` or `wss`). |
| `topic`             | No        | The STOMP topic to subscribe to. When no topic is provided, no subscription attempt is made.                                                    |
| `onMessage`         | No        | The callback to invoke when a STOMP message arrives.                                                                                            |
| `children`          | No        | Any React component subtree. Use this to tie the together the lifecycles of the `StompClient` and any components that depend on data from it.   |
| `reconnectDelay`    | No        | The delay in ms to wait before attempting to reconnect to the `endpoint` after a connections is interrupted. Defaults to 3000.                  |
| `heartbeatIncoming` | No        | The heartbeat frequency in ms to request from the server. Defaults to 30000.                                                                    |
| `heartbeatOutgoing` | No        | The heartbeat frequency in ms to send to the server. Defaults to 30000.                                                                         |
