import { z } from "zod";
import { eq } from "drizzle-orm";
import type { JwtVariables } from "hono/jwt";
import type {
  ReadResourceResult,
  CallToolResult,
  ServerRequest,
  ServerNotification,
} from "@modelcontextprotocol/sdk/types";
import type {
  ReadResourceTemplateCallback,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol";

import { db, sessionsTable, usersTable } from "~/db";
import { MessageConstants, MimeTypeJson, permit, sentenceCase, type UserRole } from "~/utils";

export type CustomJwtVariables = JwtVariables<{
  sub: string;
  role: string;
}>;

const BaseResourceSchema = z.object({
  sessionCode: z.string(),
});

export function parseAndAuthorizeResource<T extends z.AnyZodObject>(
  schema: T,
  cb: (
    uri: URL,
    data: z.infer<typeof schema>,
    user: { id: string; role: UserRole },
  ) => ReadResourceResult | Promise<ReadResourceResult>,
): ReadResourceTemplateCallback {
  return async (
    uri: URL,
    variables: Record<string, string | string[]>,
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ): Promise<ReadResourceResult> => {
    // parse zod schema
    const parsed = BaseResourceSchema.merge(schema).safeParse(variables);
    if (!parsed.success) {
      return {
        contents: [{
          uri: uri.href,
          mimeType: MimeTypeJson,
          text: JSON.stringify(parsed.error.errors),
        }],
      };
    }

    // query user data
    const rows = await db
      .select()
      .from(sessionsTable)
      .innerJoin(usersTable, eq(usersTable.id, sessionsTable.user_id))
      .where(eq(sessionsTable.code, parsed.data.sessionCode));

    if (rows.length === 0) {
      return {
        contents: [
          {
            uri: uri.href,
            text: MessageConstants.Forbidden,
          },
        ],
      };
    }

    // authorize with Permit.io
    const user = rows[0];
    const resource = sentenceCase(uri.protocol.slice(0, -2));

    const permitted = await permit.check(user.users.id, "read", resource);
    if (!permitted) {
      return {
        contents: [
          {
            uri: uri.href,
            text: MessageConstants.Forbidden,
          },
        ],
      };
    }

    return await cb(uri, parsed.data, {
      id: user.users.id,
      role: user.users.role as UserRole,
    });
  };
}

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
    const resource = sentenceCase(resourceName.slice(0, -1));

    const permitted = await permit.check(user.users.id, action, resource);
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
