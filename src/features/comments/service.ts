import { eq } from "drizzle-orm";
import { ulid } from "ulid";

import { db, commentsTable, tasksTable } from "~/db";
import { getConfig, permit } from "~/utils";

const config = getConfig();

export type CommentItem = {
  commentId: string;
  content: string;
  taskId: string;
  createdAt: Date;
};

// ----- queries

export async function isExists(commentId: string): Promise<boolean> {
  const result = await db.$count(
    commentsTable,
    eq(commentsTable.id, commentId),
  );
  return result > 0;
}

export async function isTaskExists(taskId: string): Promise<boolean> {
  const result = await db.$count(tasksTable, eq(tasksTable.id, taskId));
  return result > 0;
}

export async function list(taskId?: string): Promise<CommentItem[]> {
  const query = db.select().from(commentsTable);

  if (taskId) {
    query.where(eq(commentsTable.task_id, taskId));
  }

  const comments = await query;
  if (comments.length === 0) {
    return [];
  }

  return comments.map((c) => ({
    commentId: c.id,
    content: c.content,
    taskId: c.task_id,
    createdAt: new Date(c.created_at),
  }));
}

// ----- commands

export async function create(data: {
  content: string;
  taskId: string;
  userId: string;
  userRole: string;
}): Promise<CommentItem> {
  const rows = await db
    .insert(commentsTable)
    .values({
      id: ulid(),
      content: data.content,
      task_id: data.taskId,
      created_at: new Date().toISOString(),
      created_by: data.userId,
    })
    .returning();

  const c = rows[0];
  await permit.api.resourceInstances.create({
    key: c.id,
    resource: "Comment",
    tenant: config.permit.tenant,
  });

  await permit.api.relationshipTuples.create({
    subject: `Task:${c.task_id}`,
    relation: "parent",
    object: `Comment:${c.id}`,
    tenant: config.permit.tenant,
  });

  if (data.userRole !== "Admin") {
    await permit.api.roleAssignments.assign({
      user: data.userId,
      role: data.userRole,
      tenant: config.permit.tenant,
      resource_instance: `Comment:${data.taskId}`,
    });
  }

  return {
    commentId: c.id,
    content: c.content,
    taskId: c.task_id,
    createdAt: new Date(c.created_at),
  };
}

export async function update(
  id: string,
  content: string,
): Promise<CommentItem> {
  const comment = await db
    .update(commentsTable)
    .set({
      content,
    })
    .where(eq(commentsTable.id, id))
    .returning();

  const c = comment[0];
  return {
    commentId: c.id,
    content: c.content,
    taskId: c.task_id,
    createdAt: new Date(c.created_at),
  };
}

export async function remove(commentId: string): Promise<boolean> {
  const rows = await db
    .delete(commentsTable)
    .where(eq(commentsTable.id, commentId));

  if (rows.rowsAffected === 0) {
    return false;
  }

  await permit.api.resourceInstances.delete(`Comment:${commentId}`);
  return true;
}
