import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { EVENT_PIN, findRoom } from "../lib/agenda";
import { pinMatches, signToken } from "../lib/speakerToken";

interface VerifyPinBody {
  roomId: string;
  pin: string;
}

export async function verifyPin(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const body = (await request.json()) as Partial<VerifyPinBody>;
  if (!body.roomId || !body.pin) {
    return { status: 400, jsonBody: { error: "roomId and pin are required" } };
  }

  const room = findRoom(body.roomId);
  if (!room || !pinMatches(body.pin, EVENT_PIN)) {
    return { status: 401, jsonBody: { error: "PIN inválido" } };
  }

  try {
    return { jsonBody: { token: signToken(room.id) } };
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
