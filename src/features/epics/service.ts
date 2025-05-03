import { ulid } from "ulid";
import { and, count, eq, desc, or, sql } from "drizzle-orm";

import { db, epicsTable, tasksTable, usersTable } from "~/db";
import { getConfig, permit } from "~/utils";

const config = getConfig();

export type Epic = {
  epicId: string;
  title: string;
  createdAt: Date;
  createdBy: string;
};

// ----- queries

export async function isExists(commentId: string): Promise<boolean> {
  const result = await db.$count(epicsTable, eq(epicsTable.id, commentId));
  return result > 0;
}

export async function get(epicId: string) {
  const query = db
    .selectDistinct({
      id: epicsTable.id,
      title: epicsTable.title,
      taskCount: count(tasksTable.id),
      uniqueAssigneeCount: count(usersTable.id),
      createdAt: epicsTable.created_at,
      createdBy: epicsTable.created_by,
    })
    .from(epicsTable)
    .innerJoin(usersTable, eq(epicsTable.id, usersTable.id))
    .innerJoin(tasksTable, eq(epicsTable.id, tasksTable.epic_id))
    .groupBy(
      epicsTable.id,
      epicsTable.title,
      epicsTable.created_at,
      epicsTable.created_by,
    )
    .having(eq(epicsTable.id, epicId))
    .limit(1);

  const epics = await query;
  if (epics.length === 0) {
    return null;
  }

  const c = epics[0];
  return {
    epicId: c.id,
    title: c.title,
    taskCount: c.taskCount,
    uniqueAssigneeCount: c.uniqueAssigneeCount,
    createdAt: c.createdAt,
    createdBy: c.createdBy,
  };
}

export async function list(userId: string): Promise<Epic[]> {
  const shouldFilterUser = await db.$count(
    usersTable,
    and(eq(usersTable.id, userId), eq(usersTable.role, "Developer")),
  );

  const query = db
    .selectDistinct({
      id: epicsTable.id,
      title: epicsTable.title,
      createdAt: epicsTable.created_at,
      createdBy: epicsTable.created_by,
    })
    .from(epicsTable)
    .orderBy(desc(epicsTable.created_at));

  if (shouldFilterUser !== 0) {
    query
      .innerJoin(tasksTable, eq(tasksTable.epic_id, epicsTable.id))
      .where(
        or(
          eq(epicsTable.created_by, userId),
          eq(tasksTable.created_by, userId),
        ),
      );
  }

  const epics = await query;
  if (epics.length === 0) {
    return [];
  }

  return epics.map((epic) => ({
    epicId: epic.id,
    title: epic.title,
    createdAt: new Date(epic.createdAt),
    createdBy: epic.createdBy,
  }));
}

export type EpicStatistic = {
  epicId: string;
  title: string;
  taskCount: number;
  todoTaskCount: number;
  inProgressTaskCount: number;
  completedTaskCount: number;
  completionPercentage: number;
};
export async function statistics(): Promise<EpicStatistic[]> {
  const stats = await db
    .select({
      id: epicsTable.id,
      title: epicsTable.title,
      taskCount: count(tasksTable.id),
      todoTaskCount: sql<number>`sum(case when ${tasksTable.status} = 'TODO' then 1 else 0 end)`,
      inProgressTaskCount: sql<number>`sum(case when ${tasksTable.status} = 'IN_PROGRESS' then 1 else 0 end)`,
      completedTaskCount: sql<number>`sum(case when ${tasksTable.status} = 'DONE' then 1 else 0 end)`,
    })
    .from(epicsTable)
    .innerJoin(tasksTable, eq(epicsTable.id, tasksTable.epic_id))
    .groupBy(epicsTable.id, epicsTable.title)
    .orderBy(desc(epicsTable.created_at));

  if (stats.length === 0) {
    return [];
  }

  return stats.map((epic) => ({
    epicId: epic.id,
    title: epic.title,
    taskCount: epic.taskCount,
    todoTaskCount: epic.todoTaskCount,
    inProgressTaskCount: epic.inProgressTaskCount,
    completedTaskCount: epic.completedTaskCount,
    completionPercentage: Math.round(
      (epic.completedTaskCount / epic.taskCount) * 100,
    ),
  }));
}

// ----- commands

export async function create(data: {
  title: string;
  userId: string;
  userRole: string;
}): Promise<Epic> {
  const epic = await db
    .insert(epicsTable)
    .values({
      id: ulid(),
      title: data.title,
      created_at: new Date().toISOString(),
      created_by: data.userId,
    })
    .returning();

  const c = epic[0];

  await permit.api.resourceInstances.create({
    key: c.id,
    resource: "Epic",
    tenant: config.permit.tenant,
  });

  if (data.userRole !== "Admin") {
    await permit.api.roleAssignments.assign({
      user: data.userId,
      role: data.userRole,
      tenant: config.permit.tenant,
      resource_instance: `Epic:${c.id}`,
    });
  }

  return {
    epicId: c.id,
    title: c.title,
    createdAt: new Date(c.created_at),
    createdBy: c.created_by,
  };
}

export async function update(id: string, title: string): Promise<Epic> {
  const epic = await db
    .update(epicsTable)
    .set({
      title,
    })
    .where(eq(epicsTable.id, id))
    .returning();

  const c = epic[0];
  return {
    epicId: c.id,
    title: c.title,
    createdAt: new Date(c.created_at),
    createdBy: c.created_by,
  };
}

export async function remove(epicId: string) {
  const rows = await db.delete(epicsTable).where(eq(epicsTable.id, epicId));
  if (rows.rowsAffected === 0) {
    return false;
  }

  await permit.api.resourceInstances.delete(`Epic:${epicId}`);
  return true;
}
