import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { JwtVariables } from "hono/jwt";

import { db, sessionsTable, usersTable } from "~/db";
import { permit, type UserRole } from "~/utils";

export type CustomJwtPayload = {
  sub: string;
  role: string;
};

export type CustomJwtVariables = JwtVariables<CustomJwtPayload>;

export type SimpleUser = {
  userId: string;
  userName: string;
  fullName: string;
};

export async function mcpParseResource<T>(
  body: unknown,
  schema: z.ZodType<T>,
): Promise<
  | { success: true; data: z.infer<typeof schema> }
  | { success: false; errorMessages: string[] }
> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      errorMessages: parsed.error.issues.map((issue) => issue.message),
    };
  }

  return { success: true, data: parsed.data };
}

export async function mcpAuthorize(
  input:
    | { type: "tool"; sessionCode: string; resource: string }
    | { type: "resource"; sessionCode: string; uri: URL },
): Promise<
  { success: true; userId: string; role: UserRole } | { success: false }
> {
  const rows = await db
    .select()
    .from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.user_id))
    .where(eq(sessionsTable.code, input.sessionCode));

  if (rows.length === 0) {
    return { success: false };
  }

  const user = rows[0];
  const resource =
    input.type === "resource" ? input.uri.protocol : input.resource;

  const permitted = await permit.check(user.users.id, "read", resource);
  if (!permitted) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    userId: user.users.id,
    role: user.users.role as UserRole,
  };
}
