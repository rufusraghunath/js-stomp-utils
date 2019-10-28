declare module "react-stomp-client" {
  import { Client, Message } from "@stomp/stompjs";
  import { Component, ReactNode } from "react";

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
    static readonly defaultProps: {
      debugMode: boolean;
    };
    private static readonly RECONNECT_DELAY;
    private static readonly HEARBEAT_FREQUENCY;
    private activateAndSubscribe;
    private handleStompMessage;
    private getNewClient;

    constructor(props: Props);

    componentDidMount(): void;
    componentDidUpdate(prevProps: Props): void;
    componentWillUnmount(): void;
    render(): ReactNode;
  }
}
