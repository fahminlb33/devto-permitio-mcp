import { eq } from "drizzle-orm";

import type { z } from "zod";
import type { JwtVariables } from "hono/jwt";
import type {
  CallToolResult,
  ServerRequest,
  ServerNotification,
} from "@modelcontextprotocol/sdk/types";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol";

import { db, sessionsTable, usersTable } from "~/db";
import { MessageConstants, permit, sentenceCase, type UserRole } from "~/utils";

export type CustomJwtVariables = JwtVariables<{
  sub: string;
  role: string;
}>;

export function authorizeTool<T extends z.ZodRawShape>(
  action: string,
  resourceName: string,
  cb: (
    data: z.objectOutputType<T, z.ZodTypeAny>,
    user: { id: string; role: UserRole },
  ) => Promise<CallToolResult>,
): ToolCallback<T> {
  // @ts-ignore
  return async (
    args: z.objectOutputType<T, z.ZodTypeAny>,
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ): Promise<CallToolResult> => {
    // query the user data
    const rows = await db
      .select()
      .from(sessionsTable)
      .innerJoin(usersTable, eq(usersTable.id, sessionsTable.user_id))
      .where(eq(sessionsTable.code, args.sessionCode));

    if (rows.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: MessageConstants.Forbidden,
          },
        ],
      };
    }

    // authorize with Permit.io
    const user = rows[0];

    const permitted = await permit.check(user.users.id, action, resourceName);
    if (!permitted) {
      return {
        content: [
          {
            type: "text",
            text: MessageConstants.Forbidden,
          },
        ],
      };
    }

    return await cb(args, {
      id: user.users.id,
      role: user.users.role as UserRole,
    });
  };
}
