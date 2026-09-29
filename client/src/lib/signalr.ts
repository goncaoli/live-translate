import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { negotiate } from "./api";

export async function connect(sessionId: string): Promise<HubConnection> {
  const info = await negotiate(sessionId);

  const connection = new HubConnectionBuilder()
    .withUrl(info.url, { accessTokenFactory: () => info.accessToken })
    .withAutomaticReconnect()
    .build();

  await connection.start();
  return connection;
}
