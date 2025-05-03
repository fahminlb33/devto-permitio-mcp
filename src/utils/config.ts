import "dotenv/config";
import { z } from "zod";

const ConfigSchema = z.object({
  database: z.object({
    url: z.string(),
  }),
  permit: z.object({
    token: z.string(),
    pdpUrl: z.string().url(),
    tenant: z.string().default("default"),
  }),
  jwt: z.object({
    secret: z.string(),
    algorithm: z.enum(["HS256", "HS512"]).default("HS256"),
  }),
  webhookUrl: z.string().url(),
  debugging: z.boolean().default(false),
});

export function getConfig(): z.infer<typeof ConfigSchema> {
  return ConfigSchema.parse({
    database: {
      url: process.env.DB_URL,
    },
    permit: {
      token: process.env.PERMIT_IO_TOKEN,
      pdpUrl: process.env.PERMIT_IO_PDP_URL,
      tenant: process.env.PERMIT_IO_TENANT,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      algorithm: process.env.JWT_ALGORITHM,
    },
    webhookUrl: process.env.WEBHOOK_URL,
    debugging: !!process.env.DEBUGGING,
  });
}
