import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { sign } from "hono/jwt";
import { compare } from "bcryptjs";

import { db, usersTable, sessionsTable } from "~/db";
import { getConfig, sendNotification } from "~/utils";

const config = getConfig();

// ----- commands

export async function loginWithJWT(email: string, password: string) {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (rows.length === 0) {
    return null;
  }

  const user = rows[0];
  const isValidPassword = await compare(password, user.password_hash);
  if (!isValidPassword) {
    return null;
  }

  const accessToken = await sign(
    {
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      sub: user.id,
      role: user.role,
    },
    config.jwt.secret,
    config.jwt.algorithm,
  );

  return {
    userId: user.id,
    userName: user.email,
    role: user.role,
    accessToken,
  };
}

export async function loginWithSessionCode(email: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));
  if (rows.length === 0) {
    return false;
  }

  const user = rows[0];
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  await db.insert(sessionsTable).values({
    id: ulid(),
    code: token,
    user_id: user.id,
    created_at: new Date().toISOString(),
  });

  await sendNotification({
    userId: user.id,
    email: user.email,
    code: token,
  });

  return true;
}

export async function logoutWithSessionCode(
  sessionCode: string,
): Promise<boolean> {
  const rows = await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.code, sessionCode));

  return rows.rowsAffected > 0;
}
