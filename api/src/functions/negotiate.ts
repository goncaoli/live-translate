import { app, HttpRequest, HttpResponseInit, InvocationContext, input } from "@azure/functions";

const HUB_NAME = "translate";

const signalRConnectionInfo = input.generic({
  type: "signalRConnectionInfo",
  name: "connectionInfo",
  hubName: HUB_NAME,
  connectionStringSetting: "AzureSignalRConnectionString",
});

export async function negotiate(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  return { jsonBody: context.extraInputs.get(signalRConnectionInfo) };
}

app.http("negotiate", {
  methods: ["POST", "GET"],
  authLevel: "anonymous",
  extraInputs: [signalRConnectionInfo],
  handler: negotiate,
});
