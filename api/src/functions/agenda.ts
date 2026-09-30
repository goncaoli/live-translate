import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ROOMS, TALKS } from "../lib/agenda";

export async function agenda(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return {
    jsonBody: { rooms: ROOMS, talks: TALKS },
  };
}

app.http("agenda", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: agenda,
});
