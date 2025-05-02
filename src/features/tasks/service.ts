import { ulid } from "ulid";
import { count, eq, sql } from "drizzle-orm";

import { db, commentsTable, epicsTable, tasksTable, usersTable } from "~/db";
import { permit, type TaskStatus } from "~/utils";

export type Task = {
  taskId: string;
  title: string;
  description: string;
  timeSpent: number;
  status: TaskStatus;
  epicId: string;
  createdAt: string;
  createdBy: string;
};

// ----- queries

export async function isExists(taskId: string): Promise<boolean> {
  const result = await db.$count(tasksTable, eq(tasksTable.id, taskId));
  return result > 0;
}

export async function isEpicExists(epicId: string): Promise<boolean> {
  const result = await db.$count(epicsTable, eq(epicsTable.id, epicId));
  return result > 0;
}

export async function get(taskId: string): Promise<Task | null> {
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, taskId))
    .limit(1);

  if (tasks.length === 0) {
    return null;
  }

  const c = tasks[0];
  return {
    taskId: c.id,
    title: c.title,
    description: c.description,
    timeSpent: c.time_spent,
    status: c.status as TaskStatus,
    epicId: c.epic_id,
    createdAt: c.created_at,
    createdBy: c.created_by,
  };
}

export async function list(userId?: string) {
  const query = db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      epicId: tasksTable.epic_id,
      assigneeUserId: tasksTable.assigned_to,
      commentsCount: count(commentsTable.id),
    })
    .from(tasksTable)
    .innerJoin(commentsTable, eq(commentsTable.id, tasksTable.epic_id))
    .groupBy(
      tasksTable.id,
      tasksTable.title,
      tasksTable.epic_id,
      tasksTable.assigned_to,
    );

  if (userId) {
    query.where(eq(tasksTable.created_by, userId));
  }

  const tasks = await query;
  if (tasks.length === 0) {
    return [];
  }

  return tasks.map((x) => ({
    taskId: x.id,
    title: x.title,
    epicId: x.epicId,
    assigneeUserId: x.assigneeUserId,
    commentsCount: x.commentsCount,
  }));
}

export async function statisticsByUser() {
  const stats = await db
    .select({
      taskId: tasksTable.id,
      taskCount: count(tasksTable.id),
      userId: usersTable.id,
      firstName: usersTable.first_name,
      lastName: usersTable.last_name,
    })
    .from(tasksTable)
    .innerJoin(usersTable, eq(usersTable.id, tasksTable.epic_id))
    .groupBy(
      tasksTable.id,
      usersTable.id,
      usersTable.first_name,
      usersTable.last_name,
    );

  if (stats.length === 0) {
    return [];
  }

  return stats.map((x) => ({
    taskId: x.taskId,
    taskCount: x.taskCount,
    userId: x.userId,
    firstName: x.firstName,
    lastName: x.lastName,
  }));
}

// ----- commands

export async function create(data: {
  userId: string;
  epicId: string;
  title: string;
  description: string;
}): Promise<Task | null> {
  const row = await db
    .insert(tasksTable)
    .values({
      id: ulid(),
      title: data.title,
      description: data.description,
      time_spent: 0,
      status: "TODO",
      epic_id: data.epicId,
      created_by: data.userId,
      created_at: new Date().toISOString(),
    })
    .returning();

  const c = row[0];
  await permit.api.resourceInstances.create({
    key: c.id,
    resource: "Task",
    attributes: {
      timeSpent: c.time_spent,
    },
  });

  return {
    taskId: c.id,
    title: c.title,
    description: c.description,
    timeSpent: c.time_spent,
    status: c.status as TaskStatus,
    epicId: c.epic_id,
    createdAt: c.created_at,
    createdBy: c.created_by,
  };
}

export async function update(
  taskId: string,
  title: string,
  description: string,
) {
  const row = await db
    .update(tasksTable)
    .set({
      title: title,
      description: description,
    })
    .where(eq(tasksTable.id, taskId))
    .returning();

  const c = row[0];
  return {
    taskId: c.id,
    title: c.title,
    description: c.description,
    timeSpent: c.time_spent,
    status: c.status as TaskStatus,
    epicId: c.epic_id,
    createdAt: c.created_at,
  };
}

export async function remove(taskId: string): Promise<boolean> {
  const rows = await db.delete(tasksTable).where(eq(tasksTable.id, taskId));
  if (rows.rowsAffected > 0) {
    return false;
  }

  await permit.api.resourceInstances.delete(taskId);
  return true;
}

export async function assign(taskId: string, userId: string): Promise<Task> {
  const oldData = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, taskId))
    .limit(1);
  const row = await db
    .update(tasksTable)
    .set({ assigned_to: userId })
    .where(eq(tasksTable.id, taskId))
    .returning();

  if (oldData[0].assigned_to) {
    await permit.api.roleAssignments.unassign({
      user: oldData[0].assigned_to,
      role: "Meong???",
      resource_instance: `Tasks:${taskId}`,
    });
  }

  await permit.api.roleAssignments.assign({
    user: userId,
    role: "Meong???",
    resource_instance: `Tasks:${taskId}`,
  });

  const c = row[0];
  return {
    taskId: c.id,
    title: c.title,
    description: c.description,
    timeSpent: c.time_spent,
    status: c.status as TaskStatus,
    epicId: c.epic_id,
    createdAt: c.created_at,
    createdBy: c.created_by,
  };
}

export async function unassign(taskId: string): Promise<Task> {
  const oldData = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, taskId))
    .limit(1);
  const row = await db
    .update(tasksTable)
    .set({ assigned_to: null })
    .where(eq(tasksTable.id, taskId))
    .returning();

  if (oldData[0].assigned_to) {
    await permit.api.roleAssignments.unassign({
      user: oldData[0].assigned_to,
      role: "Meong???",
      resource_instance: `Tasks:${taskId}`,
    });
  }

  const c = row[0];
  return {
    taskId: c.id,
    title: c.title,
    description: c.description,
    timeSpent: c.time_spent,
    status: c.status as TaskStatus,
    epicId: c.epic_id,
    createdAt: c.created_at,
    createdBy: c.created_by,
  };
}

export async function logWork(
  taskId: string,
  status: TaskStatus,
  incTimeSpent: number,
) {
  const row = await db
    .update(tasksTable)
    .set({
      status: status,
      time_spent: sql`${tasksTable.time_spent} + ${incTimeSpent}`,
    })
    .where(eq(tasksTable.id, taskId))
    .returning();

  const c = row[0];
  await permit.api.resourceInstances.update(c.id, {
    attributes: {
      timeSpent: c.time_spent,
    },
  });

  return {
    taskId: c.id,
    title: c.title,
    description: c.description,
    timeSpent: c.time_spent,
    status: c.status as TaskStatus,
    epicId: c.epic_id,
    createdAt: c.created_at,
  };
}
