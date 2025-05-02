import { ulid } from "ulid";
import { and, count, eq, desc, or, sql } from "drizzle-orm";

import { db, epicsTable, tasksTable, usersTable } from "~/db";
import { permit } from "~/utils";

export type Epic = {
  epicId: string;
  title: string;
  createdAt: string;
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
    .having(eq(epicsTable.id, epicId));

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
    and(eq(usersTable.id, userId), eq(usersTable.role, "developer")),
  );

  const query = db
    .selectDistinct({
      id: epicsTable.id,
      title: epicsTable.title,
      createdAt: epicsTable.created_at,
      createdBy: epicsTable.created_by,
    })
    .from(epicsTable)
    .innerJoin(usersTable, eq(epicsTable.id, usersTable.id))
    .innerJoin(tasksTable, eq(epicsTable.id, tasksTable.epic_id))
    .orderBy(desc(epicsTable.created_at));

  if (shouldFilterUser) {
    query.where(
      or(eq(epicsTable.created_by, userId), eq(tasksTable.created_by, userId)),
    );
  }

  const epics = await query;
  if (epics.length === 0) {
    return [];
  }

  return epics.map((epic) => ({
    epicId: epic.id,
    title: epic.title,
    createdAt: epic.createdAt,
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
      completedTaskCount: sql<number>`sum(case when ${tasksTable.status} = 'COMPLETED' then 1 else 0 end)`,
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
  userId: string;
  title: string;
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
    resource: "Epic",
    key: `Epic:${c.id}`,
  });

  return {
    epicId: c.id,
    title: c.title,
    createdAt: c.created_at,
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
    createdAt: c.created_at,
    createdBy: c.created_by,
  };
}

export async function remove(id: string) {
  const rows = await db.delete(epicsTable).where(eq(epicsTable.id, id));
  if (rows.rowsAffected === 0) {
    return false;
  }

  await permit.api.resourceInstances.delete(id);
  return true;
}
