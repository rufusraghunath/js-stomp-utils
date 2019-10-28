import { Client, Message } from "@stomp/stompjs";
import { Component, ReactNode } from "react";
import isEqual from "lodash.isequal";

const noOp = () => {};

interface Props {
  endpoint: string;
  children?: ReactNode;
  topic?: string;
  debugMode?: boolean;
  reconnectDelay?: number;
  heartbeatIncoming?: number;
  heartbeatOutgoing?: number;
  onMessage?: (message: Message) => void;
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

  private getNewClient(): Client {
    const {
      endpoint,
      debugMode,
      reconnectDelay,
      heartbeatIncoming,
      heartbeatOutgoing
    } = this.props;
    return new Client({
      brokerURL: endpoint,
      debug: debugMode ? console.debug : noOp,
      reconnectDelay: reconnectDelay || StompClient.RECONNECT_DELAY,
      heartbeatIncoming: heartbeatIncoming || StompClient.HEARBEAT_FREQUENCY,
      heartbeatOutgoing: heartbeatOutgoing || StompClient.HEARBEAT_FREQUENCY
    });
  }
}
