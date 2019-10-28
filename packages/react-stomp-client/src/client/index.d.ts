declare module "react-stomp-client" {
  import { Client, Message } from "@stomp/stompjs";
  import { Component, ReactNode } from "react";

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
    static readonly defaultProps: {
      debugMode: boolean;
    };
    private static readonly RECONNECT_DELAY;
    private static readonly HEARBEAT_FREQUENCY;
    constructor(props: Props);
    componentDidMount(): void;
    componentDidUpdate(prevProps: Props): void;
    componentWillUnmount(): void;
    render(): ReactNode;
    private activateAndSubscribe;
    private handleStompMessage;
    private getBrokerUrl;
    private getNewClient;
  }
}
