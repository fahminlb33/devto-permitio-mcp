import { ulid } from "ulid";
import { hash } from "bcryptjs";
import { faker } from "@faker-js/faker";

import {
  db,
  commentsTable,
  epicsTable,
  tasksTable,
  usersTable,
} from "./src/db";
import { permit, getConfig } from "./src/utils";

const config = getConfig();

function genUser(role: string, passwordHash: string) {
  const fname = faker.person.firstName();
  const lname = faker.person.lastName();

  return {
    id: ulid(),
    email: faker.internet
      .email({ firstName: fname, lastName: lname })
      .toUpperCase(),
    first_name: fname,
    last_name: lname,
    password_hash: passwordHash,
    role: role,
    created_at: new Date().toISOString(),
  };
}

async function seedUsers(): Promise<Array<typeof usersTable.$inferSelect>> {
  // constant password and user faker
  const userPasswordHash = await hash("2025DEVChallenge", 10);

  // seed data
  const users = await db
    .insert(usersTable)
    .values([
      genUser("Admin", userPasswordHash),
      genUser("Manager", userPasswordHash),
      genUser("Manager", userPasswordHash),
      genUser("Developer", userPasswordHash),
      genUser("Developer", userPasswordHash),
      genUser("Developer", userPasswordHash),
    ])
    .returning();

  // sync with Permit.io
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

  return users;
}

async function seedEpics(
  users: Array<typeof usersTable.$inferSelect>,
): Promise<Array<typeof epicsTable.$inferSelect>> {
  // seed data
  const epics: Array<typeof epicsTable.$inferSelect> = [];
  for (const user of users.filter((x) => x.role === "Manager")) {
    const insertedEpics = await db
      .insert(epicsTable)
      .values(
        new Array(3).fill(user.id).map((userId) => ({
          id: ulid(),
          title: faker.git.commitMessage(),
          created_by: userId,
          created_at: new Date().toISOString(),
        })),
      )
      .returning();

    epics.push(...insertedEpics);
  }

  // sync with Permit.io
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

  return epics;
}

async function seedTasks(
  users: Array<typeof usersTable.$inferSelect>,
  epics: Array<typeof epicsTable.$inferSelect>,
): Promise<Array<typeof tasksTable.$inferSelect>> {
  // seed data
  const tasks: Array<typeof tasksTable.$inferSelect> = [];
  for (const user of users.filter((x) => x.role === "Manager")) {
    const insertedTasks = await db
      .insert(tasksTable)
      .values(
        new Array(5).fill(user.id).map((managerUserId) => ({
          id: ulid(),
          title: faker.git.commitMessage(),
          description: faker.lorem.paragraph(),
          time_spent: faker.number.float({ min: 0, max: 10 }),
          status: faker.helpers.arrayElement(["TODO", "IN_PROGRESS", "DONE"]),
          epic_id: faker.helpers.arrayElement(epics).id,
          assigned_to: faker.helpers.arrayElement(
            users.filter((x) => x.role === "Developer"),
          ).id,
          created_by: managerUserId,
          created_at: new Date().toISOString(),
        })),
      )
      .returning();

    tasks.push(...insertedTasks);
  }

  // sync with Permit.io
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
  }

  return tasks;
}

async function seedComments(
  tasks: Array<typeof tasksTable.$inferSelect>,
): Promise<Array<typeof commentsTable.$inferSelect>> {
  // seed data
  const comments: Array<typeof commentsTable.$inferSelect> = [];
  for (const task of tasks) {
    const insertedComments = await db
      .insert(commentsTable)
      .values([
        {
          id: ulid(),
          content: faker.lorem.sentence(),
          task_id: task.id,
          // biome-ignore lint/style/noNonNullAssertion: See code above
          created_by: task.assigned_to!,
          created_at: new Date().toISOString(),
        },
        // {
        //   id: ulid(),
        //   content: faker.lorem.sentence(),
        //   task_id: task.id,
        //   created_by: task.created_by,
        //   created_at: new Date().toISOString(),
        // },
      ])
      .returning();

    comments.push(...insertedComments);
  }

  // sync with Permit.io
  for (const comment of comments) {
    await permit.api.resourceInstances.create({
      key: comment.id,
      resource: "Comment",
      tenant: config.permit.tenant,
    });

    await permit.api.roleAssignments.assign({
      user: comment.created_by,
      role: "Developer",
      tenant: config.permit.tenant,
      resource_instance: `Comment:${comment.id}`,
    });
  }

  return comments;
}

async function main() {
  faker.seed(123);

  console.log("---------- USERS ----------");
  const users = await seedUsers();
  for (const x of users) {
    console.log(
      `${x.id}\t${x.role}\t${x.email}\t${x.first_name} ${x.last_name}`,
    );
  }

  console.log("---------- EPICS ----------");
  const epics = await seedEpics(users);
  for (const x of epics) {
    console.log(`${x.id}\t${x.title}\t${x.created_by}`);
  }

  console.log("---------- TASKS ----------");
  const tasks = await seedTasks(users, epics);
  for (const x of tasks) {
    console.log(`${x.id}\t${x.title}\t${x.created_by}`);
  }

  console.log("---------- COMMENTS ----------");
  const comments = await seedComments(tasks);
  for (const x of comments) {
    console.log(`${x.id}\t${x.content}\t${x.created_by}`);
  }
}

main();
