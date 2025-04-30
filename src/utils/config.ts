import { z } from "zod";

const ConfigSchema = z.object({
  database: z.object({
    url: z.string().url(),
  }),
  permit: z.object({
    token: z.string(),
    pdpUrl: z.string().url(),
  }),
  jwt: z.object({
    secret: z.string(),
    algorithm: z.enum(["HS256", "HS512"]).default("HS256"),
  }),
  webhookUrl: z.string().url(),
});

export function getConfig(): z.infer<typeof ConfigSchema> {
  return ConfigSchema.parse({
    database: {
      url: process.env.DB_URL,
    },
    permit: {
      token: process.env.PERMITIO_TOKEN,
      pdpUrl: process.env.PERMITIO_PDP_URL,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
    },
    webhookUrl: process.env.WEBHOOK_URL,
  });
}
