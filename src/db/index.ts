import { drizzle } from "drizzle-orm/libsql";
import { getConfig } from "../utils";

const config = getConfig();

const db = drizzle({
  connection: {
    url: config.database.url,
  },
});

export { db };
export * from "./schema";
