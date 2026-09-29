import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";
import { groupName } from "../lib/groups";

const HUB_NAME = "translate";

const signalRGroupActions = output.generic({
  type: "signalR",
  name: "signalRGroupActions",
  hubName: HUB_NAME,
  connectionStringSetting: "AzureSignalRConnectionString",
});

interface JoinGroupBody {
  connectionId: string;
  sessionId: string;
  lang: string;
}

export async function joinGroup(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const body = (await request.json()) as Partial<JoinGroupBody>;
  if (!body.connectionId || !body.sessionId || !body.lang) {
    return { status: 400, jsonBody: { error: "connectionId, sessionId and lang are required" } };
  }

  context.extraOutputs.set(signalRGroupActions, {
    connectionId: body.connectionId,
    groupName: groupName(body.sessionId, body.lang),
    action: "add",
  });

  return { status: 204 };
}

app.http("joinGroup", {
  methods: ["POST"],
  authLevel: "anonymous",
  extraOutputs: [signalRGroupActions],
  handler: joinGroup,
});
