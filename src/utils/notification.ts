import { getConfig } from "./config";

const config = getConfig();

export async function sendNotification(content: unknown) {
  await fetch(config.webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(content),
  });
}
