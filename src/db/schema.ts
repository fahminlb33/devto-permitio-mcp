import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: text().primaryKey(),
  email: text().notNull().unique(),
  first_name: text().notNull(),
  last_name: text().notNull(),
  password_hash: text().notNull(),
  role: text().notNull(),
  created_at: text().notNull(),
});

export const sessionsTable = sqliteTable("sessions", {
  id: text().primaryKey(),
  code: text().notNull(),
  user_id: text()
    .notNull()
    .references(() => usersTable.id),
  created_at: text().notNull(),
});

export const epicsTable = sqliteTable("epics", {
  id: text().primaryKey(),
  title: text().notNull(),
  created_at: text().notNull(),
  created_by: text()
    .notNull()
    .references(() => usersTable.id),
});

export const tasksTable = sqliteTable("tasks", {
  id: text().primaryKey(),
  title: text().notNull(),
  description: text().notNull(),
  time_spent: int().notNull(),
  status: text().notNull(),
  epic_id: text()
    .notNull()
    .references(() => epicsTable.id),
  assigned_to: text().references(() => usersTable.id),
  created_at: text().notNull(),
  created_by: text()
    .notNull()
    .references(() => usersTable.id),
});

export const commentsTable = sqliteTable("comments", {
  id: text().primaryKey(),
  content: text().notNull(),
  task_id: text()
    .notNull()
    .references(() => tasksTable.id),
  created_at: text().notNull(),
  created_by: text()
    .notNull()
    .references(() => usersTable.id),
});
