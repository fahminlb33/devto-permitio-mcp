import { hash } from "bcryptjs";
import { faker } from "@faker-js/faker";

import {
  db,
  commentsTable,
  epicsTable,
  tasksTable,
  usersTable,
} from "../src/db";

function genUser(role: string, passwordHash: string) {
  const fname = faker.person.firstName();
  const lname = faker.person.lastName();

  return {
    id: faker.string.ulid(),
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
  const userPasswordHash = await hash("2025DEVChallenge", 10);

  return await db
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
}

async function seedEpics(
  users: Array<typeof usersTable.$inferSelect>,
): Promise<Array<typeof epicsTable.$inferSelect>> {
  const rows = users
    .filter((user) => user.role === "Manager")
    .flatMap((user) =>
      new Array(3).fill(user.id).map((userId) => ({
        id: faker.string.ulid(),
        title: faker.git.commitMessage(),
        created_by: userId,
        created_at: new Date().toISOString(),
      })),
    );

  return await db.insert(epicsTable).values(rows).returning();
}

async function seedTasks(
  users: Array<typeof usersTable.$inferSelect>,
  epics: Array<typeof epicsTable.$inferSelect>,
): Promise<Array<typeof tasksTable.$inferSelect>> {
  const tasks = users
    .filter((x) => x.role === "Manager")
    .flatMap((user) =>
      new Array(5).fill(user.id).map((managerUserId) => ({
        id: faker.string.ulid(),
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
    );

  return await db.insert(tasksTable).values(tasks).returning();
}

async function seedComments(
  tasks: Array<typeof tasksTable.$inferSelect>,
): Promise<Array<typeof commentsTable.$inferSelect>> {
  const comments: Array<typeof commentsTable.$inferSelect> = [];
  for (const task of tasks) {
    const insertedComments = await db
      .insert(commentsTable)
      .values([
        {
          id: faker.string.ulid(),
          content: faker.lorem.sentence(),
          task_id: task.id,
          // biome-ignore lint/style/noNonNullAssertion: See code above
          created_by: task.assigned_to!,
          created_at: new Date().toISOString(),
        },
        {
          id: faker.string.ulid(),
          content: faker.lorem.sentence(),
          task_id: task.id,
          created_by: task.created_by,
          created_at: new Date().toISOString(),
        },
      ])
      .returning();

    comments.push(...insertedComments);
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
