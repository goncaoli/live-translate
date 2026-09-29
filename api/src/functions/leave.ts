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

interface LeaveBody {
  sessionId: string;
}

export async function leave(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const body = (await request.json()) as Partial<LeaveBody>;
  if (!body.sessionId) {
    return { status: 400, jsonBody: { error: "sessionId is required" } };
  }

  context.extraOutputs.set(signalRMessages, [
    {
      groupName: groupName(body.sessionId, PRESENCE_LANG),
      target: "participantLeft",
      arguments: [],
    },
    {
      groupName: groupName("agenda", "live"),
      target: "participantLeft",
      arguments: [{ talkId: body.sessionId }],
    },
  ]);

  return { status: 204 };
}

app.http("leave", {
  route: "leave",
  methods: ["POST"],
  authLevel: "anonymous",
  extraOutputs: [signalRMessages],
  handler: leave,
});
