import { permit, getConfig } from "../src/utils";

const config = getConfig();

async function bulkDeleteResourceInstance(resourceKeys: string[]) {
  try {
    const res = await fetch(
      "https://api.permit.io/v2/facts/default/dev/bulk/resource_instances",
      {
        method: "DELETE",
        redirect: "follow",
        headers: {
          Authorization: `Bearer ${config.permit.token}`,
        },
        body: JSON.stringify({
          idents: resourceKeys,
        }),
      },
    );

    const body = await res.json();
    console.log(body);
  } catch (error) {
    console.error(error);
  }
}

type Resource = Awaited<ReturnType<typeof permit.api.resourceInstances.list>>;

async function main() {
  console.log("---------- USERS ----------");
  const users = await permit.api.users.list();
  await permit.api.users.bulkUserDelete(users.data.map((x) => x.key));

  console.log(`Deleted user count: ${users.data.length}`);

  console.log("\n\n---------- COMMENTS ----------");
  let resources: Resource = await permit.api.resourceInstances.list({});

  do {
    const batch = resources.map((x) => `${x.resource}:${x.key}`);
    await bulkDeleteResourceInstance(batch);
    resources = await permit.api.resourceInstances.list({});
  } while (resources.length > 0);
}

main();
