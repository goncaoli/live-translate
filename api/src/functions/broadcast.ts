import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";
import { groupName } from "../lib/groups";
import { verifyToken } from "../lib/speakerToken";

const HUB_NAME = "translate";

const signalRMessages = output.generic({
  type: "signalR",
  name: "signalRMessages",
  hubName: HUB_NAME,
  connectionStringSetting: "AzureSignalRConnectionString",
});

interface BroadcastBody {
  sessionId: string;
  original: string;
  translations: Record<string, string>;
  isFinal: boolean;
}

export async function broadcast(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const body = (await request.json()) as Partial<BroadcastBody>;
  if (!body.sessionId || !body.translations) {
    return { status: 400, jsonBody: { error: "sessionId and translations are required" } };
  }

  const token = request.headers.get("x-speaker-token");
  if (!verifyToken(token, body.sessionId)) {
    return { status: 401, jsonBody: { error: "Token de orador inválido ou em falta" } };
  }

  const messages = Object.entries(body.translations).map(([lang, text]) => ({
    groupName: groupName(body.sessionId as string, lang),
    target: "translation",
    arguments: [{ text, original: body.original ?? "", final: body.isFinal ?? true }],
  }));

  context.extraOutputs.set(signalRMessages, messages);

  return { status: 204 };
}

app.http("broadcast", {
  methods: ["POST"],
  authLevel: "anonymous",
  extraOutputs: [signalRMessages],
  handler: broadcast,
});
