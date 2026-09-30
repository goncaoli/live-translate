import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";
import { groupName } from "../lib/groups";

const HUB_NAME = "translate";
const PRESENCE_LANG = "presence";

const signalRMessages = output.generic({
  type: "signalR",
  name: "signalRMessages",
  hubName: HUB_NAME,
  connectionStringSetting: "AzureSignalRConnectionString",
});

interface PresenceBody {
  sessionId: string;
}

export async function presence(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const body = (await request.json()) as Partial<PresenceBody>;
  if (!body.sessionId) {
    return { status: 400, jsonBody: { error: "sessionId is required" } };
  }

  context.extraOutputs.set(signalRMessages, [
    {
      groupName: groupName(body.sessionId, PRESENCE_LANG),
      target: "participantJoined",
      arguments: [],
    },
    {
      // Lets the agenda page keep a live per-room participant count without
      // joining one SignalR group per room.
      groupName: groupName("agenda", "live"),
      target: "participantJoined",
      arguments: [{ roomId: body.sessionId }],
    },
  ]);

  return { status: 204 };
}

app.http("presence", {
  methods: ["POST"],
  authLevel: "anonymous",
  extraOutputs: [signalRMessages],
  handler: presence,
});
