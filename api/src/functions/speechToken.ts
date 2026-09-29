import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import axios from "axios";

export async function speechToken(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const key = process.env.SPEECH_KEY;
  const region = process.env.SPEECH_REGION;
  if (!key || !region) {
    context.error("SPEECH_KEY / SPEECH_REGION not configured");
    return { status: 500, jsonBody: { error: "Speech service not configured" } };
  }

  try {
    const response = await axios.post<string>(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      null,
      { headers: { "Ocp-Apim-Subscription-Key": key } },
    );
    return { jsonBody: { token: response.data, region } };
  } catch (err) {
    context.error(err);
    return { status: 502, jsonBody: { error: "Failed to obtain speech token" } };
  }
}

app.http("speechToken", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: speechToken,
});
