import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { negotiate } from "./api";

export async function connect(sessionId: string, onReconnected?: (connectionId: string) => void): Promise<HubConnection> {
  const info = await negotiate(sessionId);

  const connection = new HubConnectionBuilder()
    .withUrl(info.url, {
      // Access tokens expire; refetch on every (re)connect attempt instead of
      // reusing the one captured at negotiate time, or long sessions break.
      accessTokenFactory: async () => (await negotiate(sessionId)).accessToken,
    })
    .withAutomaticReconnect()
    .build();

  if (onReconnected) {
    connection.onreconnected((connectionId) => {
      if (connectionId) onReconnected(connectionId);
    });
  }

  await connection.start();
  return connection;
}
