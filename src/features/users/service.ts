import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { hash } from "bcryptjs";

import { db, sessionsTable, usersTable } from "~/db";
import { permit, type UserRole } from "~/utils";

export type User = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
};

// ----- queries

export async function isExists(userId: string): Promise<boolean> {
  const result = await db.$count(usersTable, eq(usersTable.id, userId));
  return result > 0;
}

export async function isEmailTaken(email: string): Promise<boolean> {
  const result = await db.$count(
    usersTable,
    eq(usersTable.email, email.toUpperCase()),
  );

  return result > 0;
}

export type GetUserType = {
  type: "id" | "email" | "sessionCode";
  value: string;
};

export async function get(identifier: GetUserType): Promise<User | null> {
  if (identifier.type === "sessionCode") {
    const user = await db
      .select()
      .from(usersTable)
      .innerJoin(sessionsTable, eq(sessionsTable.user_id, usersTable.id))
      .where(eq(sessionsTable.code, identifier.value));

    if (user.length === 0) {
      return null;
    }

    const c = user[0].users;
    return {
      userId: c.id,
      email: c.email,
      firstName: c.first_name,
      lastName: c.last_name,
      role: c.role as UserRole,
      createdAt: new Date(c.created_at),
    };
  }

  const col = {
    id: usersTable.id,
    email: usersTable.email,
  };

  const query = db
    .select()
    .from(usersTable)
    .where(eq(col[identifier.type], identifier.value));

  const user = await query;
  if (user.length === 0) {
    return null;
  }

  const c = user[0];
  return {
    userId: c.id,
    email: c.email,
    firstName: c.first_name,
    lastName: c.last_name,
    role: c.role as UserRole,
    createdAt: new Date(c.created_at),
  };
}

export async function list(): Promise<User[]> {
  const users = await db.select().from(usersTable);
  if (users.length === 0) {
    return [];
  }

  return users.map((c) => ({
    userId: c.id,
    email: c.email,
    firstName: c.first_name,
    lastName: c.last_name,
    role: c.role as UserRole,
    createdAt: new Date(c.created_at),
  }));
}

// ----- commands

export async function create(data: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
}): Promise<User> {
  const user = await db
    .insert(usersTable)
    .values({
      id: ulid(),
      email: data.email.toUpperCase(),
      first_name: data.firstName,
      last_name: data.lastName,
      password_hash: await hash(data.password, 10),
      role: data.role,
      created_at: new Date().toISOString(),
    })
    .returning();

  const c = user[0];

  await permit.api.users.sync({
    key: c.id,
    email: c.email,
    first_name: c.first_name,
    last_name: c.last_name,
    attributes: {},
    role_assignments: [
      {
        role: c.role,
      },
    ],
  });

  return {
    userId: c.id,
    email: c.email,
    firstName: c.first_name,
    lastName: c.last_name,
    role: c.role as UserRole,
    createdAt: new Date(c.created_at),
  };
}

export async function remove(userId: string): Promise<boolean> {
  const rowsAffected = await db
    .delete(usersTable)
    .where(eq(usersTable.id, userId));

  if (rowsAffected.rowsAffected === 0) {
    return false;
  }

  await permit.api.users.delete(userId);
  return true;
}
