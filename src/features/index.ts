export * from "./common";

// hono handlers
import authHono from "./auth/hono-handlers";
import usersHono from "./users/hono-handlers";
import epicsHono from "./epics/hono-handlers";
import tasksHono from "./tasks/hono-handlers";
import commentsHono from "./comments/hono-handlers";

export { authHono, usersHono, epicsHono, tasksHono, commentsHono };

// mcp handlers
import authMcp from "./auth/mcp-handlers";
import usersMcp from "./users/mcp-handlers";
import epicsMcp from "./epics/mcp-handlers";
import tasksMcp from "./tasks/mcp-handlers";
import commentsMcp from "./comments/mcp-handlers";

export { authMcp, usersMcp, epicsMcp, tasksMcp, commentsMcp };
