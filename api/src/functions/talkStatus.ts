import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";
import { groupName } from "../lib/groups";
import { verifyToken } from "../lib/speakerToken";

const HUB_NAME = "translate";
const AGENDA_SESSION = "agenda";
const AGENDA_CHANNEL = "live";

const signalRMessages = output.generic({
  type: "signalR",
  name: "signalRMessages",
  hubName: HUB_NAME,
  connectionStringSetting: "AzureSignalRConnectionString",
});

interface TalkStatusBody {
  talkId: string;
  // navigator.sendBeacon (used as a best-effort "tab closed" signal) can't
  // set custom headers, so it falls back to sending the token in the body.
  token?: string;
}

function makeHandler(live: boolean) {
  return async function handler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const body = (await request.json()) as Partial<TalkStatusBody>;
    if (!body.talkId) {
      return { status: 400, jsonBody: { error: "talkId is required" } };
    }

    const token = request.headers.get("x-speaker-token") ?? body.token;
    if (!verifyToken(token, body.talkId)) {
      return { status: 401, jsonBody: { error: "Token de orador inválido ou em falta" } };
    }

    context.extraOutputs.set(signalRMessages, [
      {
        groupName: groupName(AGENDA_SESSION, AGENDA_CHANNEL),
        target: "talkStatusChanged",
        arguments: [{ talkId: body.talkId, live }],
      },
    ]);

    return { status: 204 };
  };
}

app.http("talkStarted", {
  route: "talkStarted",
  methods: ["POST"],
  authLevel: "anonymous",
  extraOutputs: [signalRMessages],
  handler: makeHandler(true),
});

app.http("talkEnded", {
  route: "talkEnded",
  methods: ["POST"],
  authLevel: "anonymous",
  extraOutputs: [signalRMessages],
  handler: makeHandler(false),
});
