import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { findTalk } from "../lib/agenda";
import { pinMatches, signToken } from "../lib/speakerToken";

interface VerifyPinBody {
  talkId: string;
  pin: string;
}

export async function verifyPin(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const body = (await request.json()) as Partial<VerifyPinBody>;
  if (!body.talkId || !body.pin) {
    return { status: 400, jsonBody: { error: "talkId and pin are required" } };
  }

  const talk = findTalk(body.talkId);
  if (!talk || !pinMatches(body.pin, talk.pin)) {
    return { status: 401, jsonBody: { error: "PIN inválido" } };
  }

  try {
    return { jsonBody: { token: signToken(talk.id) } };
  } catch (err) {
    context.error(err);
    return { status: 500, jsonBody: { error: "Server misconfigured" } };
  }
}

app.http("verifyPin", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: verifyPin,
});
