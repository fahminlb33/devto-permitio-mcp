import {
  db,
  commentsTable,
  epicsTable,
  tasksTable,
  usersTable,
} from "../src/db";
import { permit, getConfig } from "../src/utils";

const config = getConfig();

async function syncUsers() {
  const users = await db.select().from(usersTable);
  for (const user of users) {
    await permit.api.users.sync({
      key: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role_assignments: [
        {
          role: user.role,
          tenant: config.permit.tenant,
        },
      ],
    });
  }
}

async function syncEpics() {
  const epics = await db.select().from(epicsTable);
  for (const epic of epics) {
    await permit.api.resourceInstances.create({
      key: epic.id,
      resource: "Epic",
      tenant: config.permit.tenant,
    });

    await permit.api.roleAssignments.assign({
      user: epic.created_by,
      role: "Manager",
      tenant: config.permit.tenant,
      resource_instance: `Epic:${epic.id}`,
    });
  }
}

async function syncTasks() {
  const tasks = await db.select().from(tasksTable);
  for (const task of tasks) {
    await permit.api.resourceInstances.create({
      key: task.id,
      resource: "Task",
      tenant: config.permit.tenant,
      attributes: {
        time_spent: task.time_spent,
        status: task.status,
      },
    });

    await permit.api.roleAssignments.assign({
      user: task.created_by,
      role: "Manager",
      tenant: config.permit.tenant,
      resource_instance: `Task:${task.id}`,
    });

    await permit.api.relationshipTuples.create({
      subject: `Epic:${task.epic_id}`,
      relation: "parent",
      object: `Task:${task.id}`,
      tenant: config.permit.tenant,
    });
  }
}

async function syncComments() {
  const comments = await db.select().from(commentsTable);
  for (const comment of comments) {
    await permit.api.resourceInstances.create({
      key: comment.id,
      resource: "Comment",
      tenant: config.permit.tenant,
    });

    await permit.api.relationshipTuples.create({
      subject: `Task:${comment.task_id}`,
      relation: "parent",
      object: `Comment:${comment.id}`,
      tenant: config.permit.tenant,
    });

    await permit.api.roleAssignments.assign({
      user: comment.created_by,
      role: "Developer",
      tenant: config.permit.tenant,
      resource_instance: `Comment:${comment.id}`,
    });
  }
}

async function main() {
  console.log("---------- USERS ----------");
  await syncUsers();

  console.log("---------- EPICS ----------");
  await syncEpics();

  console.log("---------- TASKS ----------");
  await syncTasks();

  console.log("---------- COMMENTS ----------");
  await syncComments();
}

main();
