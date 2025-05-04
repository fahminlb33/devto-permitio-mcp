# DEV.to Permit.io Authorization Challenge

This is a simple JIRA-like task management API, you can expect feature such as Epics, Tasks, and Comments just like in JIRA.

The key point of this project is this repo contains two APIs, (1) a classic REST API using Hono.js and (2) an MCP using the MCP TypeScript SDK.

### Permit.io Allowed for Easy Authorization

#### REST API with Hono

In traditional web API, implementing Permit.io authorization as a middleware simplifed and also centralized the authorization process, no more messy authorization check on every endpoints.

#### MCP Server

The same authorization technique in the web API can easily be reused in MCP server (with some changes). With Permit.io, the authorization process is "framework-agnostic" so I can effectively implement the authorization process with any framework easily.

## Development Setup

To run this project, you will need **NodeJS 23** and Docker.

Follow these steps:

1. Clone this repo `git clone https://github.com/fahminlb33/devto-permitio-mcp.git`
2. Install packages `npm install`
3. Perform database migration `npm db:migrate`
4. Seed the database `npm db:seed`, you will get user the credentials here. The password is "2025DEVChallenge"
5. Copy the `.env.example` into `.env`, fill out the env with your Permit.io environment key!
6. Sync the database with Permit.io `npm run permit:sync`

Now you're ready to run the local PDP server before starting the Hono REST API and MCP server.

### Running the Local PDP Server

This project uses ReBAC, so you MUST run a local PDP to authorize some of the APIs.

Make sure you have a valid environment file as described above, then you can run:

```bash
docker network create devto-permitio-mcp

docker run -d -it \
  -p 7766:7000 \
  --env-file .env \
  --net devto-permitio-mcp \
  --name devto-permitio-mcp-pdp \
  permitio/pdp-v2:latest
```

Make sure that your PDP URL in the environment also points to `http://localhost:7766`

### Running the REST API (Hono)

To run the REST API, execute `npm run dev:api`

You can also check out the Postman collection by importing the `DEV.to Permit.io Hackathon.postman_collection.json`

### Running the MCP Inspector

To run the MCP server via the MCP inspector, execute `npm run dev:mcp`

Click `Connect` and then go to `Tools` tab, then click `List Tools`. You would want to start with Login

### Using the MCP Server in Claude Desktop

I like to use Docker to run the MCP server because I primarily working with WSL and I don't want to install NodeJS in my Windows.

First, build the image.

`docker build -t devto-permitio-todo:latest .`

Then you can open Claude Desktop and go to `Hamburger menu > File > Settings...`. Select the `Developer` menu and then `Edit Config`.

Paste the config below.

```json
{
  "mcpServers": {
    "miniKanban": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--env-file",
        "D:/devto-permitio-mcp/docker.env",
        "-v",
        "D:/devto-permitio-mcp/local.db:/app/local.db:rw",
        "--net",
        "devto-permitio-mcp",
        "--name",
        "devto-permitio-mcp",
        "devto-permitio-mcp:latest",
        "node",
        "app.mcp.js"
      ]
    }
  }
}

```

Make sure to change the volume path to the correct directory that contained the SQLite database file. If you're using WSL, copy the file to Windows first!

Don't forget to also copy the environment file and adjust the path accordingly. Other thing to change is the `PERMIT_IO_PDP_URL` so it point to the correct docker container, for example `http://devto-permitio-mcp-pdp:7000` (notice the port is the container port, not host port).

Restart Calude Desktop and you should be seeing new tools available.
