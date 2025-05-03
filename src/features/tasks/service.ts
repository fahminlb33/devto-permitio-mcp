import { ulid } from "ulid";
import { count, eq, sql } from "drizzle-orm";

import { db, commentsTable, epicsTable, tasksTable, usersTable } from "~/db";
import { getConfig, permit, type TaskStatus } from "~/utils";

const config = getConfig();

export type Task = {
  taskId: string;
  title: string;
  description: string;
  timeSpent: number;
  status: TaskStatus;
  epicId: string;
  createdAt: Date;
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

export async function get(
  taskId: string,
): Promise<(Task & { commentsCount: number }) | null> {
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, taskId))
    .limit(1);

  if (tasks.length === 0) {
    return null;
  }

  const commentsCount = await db.$count(
    commentsTable,
    eq(commentsTable.task_id, taskId),
  );

  const c = tasks[0];
  return {
    taskId: c.id,
    title: c.title,
    description: c.description,
    timeSpent: c.time_spent,
    status: c.status as TaskStatus,
    commentsCount: commentsCount,
    epicId: c.epic_id,
    createdAt: new Date(c.created_at),
    createdBy: c.created_by,
  };
}

export async function list(epicId?: string, userId?: string) {
  const query = db.select().from(tasksTable);

  if (epicId) {
    query.where(eq(tasksTable.epic_id, epicId));
  }

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
    description: x.description,
    timeSpent: x.time_spent,
    status: x.status,
    epicId: x.epic_id,
    createdAt: new Date(x.created_at),
    createdBy: x.created_by,
  }));
}

export async function statisticsByUser() {
  const stats = await db
    .select({
      userId: usersTable.id,
      firstName: usersTable.first_name,
      lastName: usersTable.last_name,
      taskCount: count(tasksTable.id),
    })
    .from(tasksTable)
    .leftJoin(usersTable, eq(usersTable.id, tasksTable.assigned_to))
    .groupBy(usersTable.id, usersTable.first_name, usersTable.last_name);

  if (stats.length === 0) {
    return [];
  }

  return stats.map((x) => ({
    taskCount: x.taskCount,
    userId: x.userId,
    firstName: x.firstName,
    lastName: x.lastName,
  }));
}

export async function statisticsByTask() {
  const query = db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      epicId: tasksTable.epic_id,
      assigneeUserId: tasksTable.assigned_to,
      createdBy: tasksTable.created_by,
      commentsCount: count(commentsTable.id),
    })
    .from(tasksTable)
    .leftJoin(commentsTable, eq(commentsTable.task_id, tasksTable.id))
    .groupBy(
      tasksTable.id,
      tasksTable.title,
      tasksTable.epic_id,
      tasksTable.assigned_to,
      tasksTable.created_by,
    );

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

// ----- commands

export async function create(data: {
  title: string;
  description: string;
  epicId: string;
  userId: string;
  userRole: string;
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
    tenant: config.permit.tenant,
    attributes: {
      time_spent: c.time_spent,
      status: c.status,
    },
  });

  await permit.api.relationshipTuples.create({
    subject: `Epic:${c.epic_id}`,
    relation: "parent",
    object: `Task:${c.id}`,
    tenant: config.permit.tenant,
  });

  if (data.userRole !== "Admin") {
    await permit.api.roleAssignments.assign({
      user: data.userId,
      role: data.userRole,
      tenant: config.permit.tenant,
      resource_instance: `Task:${c.id}`,
    });
  }

  return {
    taskId: c.id,
    title: c.title,
    description: c.description,
    timeSpent: c.time_spent,
    status: c.status as TaskStatus,
    epicId: c.epic_id,
    createdAt: new Date(c.created_at),
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
  if (rows.rowsAffected === 0) {
    return false;
  }

  await permit.api.resourceInstances.delete(`Task:${taskId}`);
  return true;
}

export async function assign(taskId: string, userId: string): Promise<Task> {
  const oldData = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, taskId))
    .limit(1);

  if (oldData[0].assigned_to) {
    await permit.api.roleAssignments
      .unassign({
        user: oldData[0].assigned_to,
        role: "Developer",
        tenant: config.permit.tenant,
        resource_instance: `Task:${taskId}`,
      })
      .catch((ex) => console.error(ex));
  }

  const row = await db
    .update(tasksTable)
    .set({ assigned_to: userId })
    .where(eq(tasksTable.id, taskId))
    .returning();

  const c = row[0];

  await permit.api.roleAssignments.assign({
    user: userId,
    role: "Developer",
    tenant: config.permit.tenant,
    resource_instance: `Task:${taskId}`,
  });

  return {
    taskId: c.id,
    title: c.title,
    description: c.description,
    timeSpent: c.time_spent,
    status: c.status as TaskStatus,
    epicId: c.epic_id,
    createdAt: new Date(c.created_at),
    createdBy: c.created_by,
  };
}

export async function unassign(taskId: string): Promise<Task> {
  const oldData = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, taskId))
    .limit(1);

  if (oldData[0].assigned_to) {
    await permit.api.roleAssignments
      .unassign({
        user: oldData[0].assigned_to,
        role: "Developer",
        tenant: config.permit.tenant,
        resource_instance: `Task:${taskId}`,
      })
      .catch((ex) => console.error(ex));
  }

  const row = await db
    .update(tasksTable)
    .set({ assigned_to: null })
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
    createdAt: new Date(c.created_at),
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
  await permit.api.resourceInstances.update(`Task:${c.id}`, {
    attributes: {
      time_spent: c.time_spent,
      status: c.status,
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
