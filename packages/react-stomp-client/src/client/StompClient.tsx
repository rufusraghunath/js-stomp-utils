/* eslint-disable no-console */

import { Client, Message } from "@stomp/stompjs";
import { Component, ReactNode } from "react";
import { isEqual } from "lodash";

const noOp = () => {};

interface Props {
  children: ReactNode;
  topic?: string;
  onMessage?: (message: Message) => void;
  port?: number;
  debugMode?: boolean;
}

interface State {
  stompClient: Client;
}

export default class StompClient extends Component<Props, State> {
  public static readonly defaultProps = {
    debugMode: false
  };

  private static readonly RECONNECT_DELAY = 3000;
  private static readonly HEARBEAT_FREQUENCY = 30000;

  constructor(props: Props) {
    super(props);
    this.handleStompMessage = this.handleStompMessage.bind(this);
    this.state = {
      stompClient: this.getNewClient()
    };
  }

  public componentDidMount(): void {
    this.activateAndSubscribe(this.state.stompClient);
  }

  public componentDidUpdate(prevProps: Props): void {
    if (isEqual(this.props, prevProps)) {
      return; // no need to set the state
    } else {
      this.state.stompClient.deactivate();

      const newStompClient = this.getNewClient();

      this.activateAndSubscribe(newStompClient);

      this.setState({
        stompClient: newStompClient
      });
    }
  }

  public componentWillUnmount(): void {
    this.state.stompClient.deactivate();
  }

  public render(): ReactNode {
    return this.props.children;
  }

  private activateAndSubscribe(stompClient: Client) {
    const { topic } = this.props;

    stompClient.onConnect = () => {
      if (topic) {
        stompClient.subscribe(`/${topic}`, this.handleStompMessage);
      }
    };

    stompClient.activate();
  }

  private handleStompMessage(stompMessage: Message) {
    const { onMessage } = this.props;
    if (onMessage) {
      onMessage(stompMessage);
    }
  }

  private getBrokerUrl(): string {
    // TODO: pass this whole thing as a prop
    const { port } = this.props;
    const hostname = "localhost";
    const protocol =
      process.env.NODE_ENV === "development" || hostname === "localhost"
        ? "ws"
        : "wss";
    return `${protocol}://${hostname}:${port}/websocket`;
  }

  private getNewClient(): Client {
    return new Client({
      brokerURL: this.getBrokerUrl(),
      debug: this.props.debugMode ? console.debug : noOp,
      reconnectDelay: StompClient.RECONNECT_DELAY, // TODO: make configurable
      heartbeatIncoming: StompClient.HEARBEAT_FREQUENCY, // TODO: make configurable
      heartbeatOutgoing: StompClient.HEARBEAT_FREQUENCY // TODO: make configurable
    });
  }
}
