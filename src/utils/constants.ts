import { sentenceCase } from "./strings";

export const MimeTypeJson = "application/json";

export type UserRole = "Admin" | "Manager" | "Developer";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export enum ResourceActions {
  Create = "create",
  Read = "read",
  Update = "update",
  Delete = "delete",
  Assign = "assign",
  Unassign = "unassign",
  LogWork = "log-work",
}

export enum ResourceNames {
  User = "User",
  Epic = "Epic",
  Task = "Task",
  Comment = "Comment",
}

export enum MessageConstants {
  Forbidden = "You are not permitted to access this resource",
  InvalidSession = "Session is invalid, check your session code again or login again",
  InvalidUser = "User with the specified email and or password is not found",
  UserNotFound = "User with email {0} not found",

  SessionCodeSent = "We have sent you the 6 digit code via email",
  SessionRevoked = "User has been logged out and session is now invalid",
}

export enum HttpStatus {
  OK = 200,
  Created = 201,
  Accepted = 202,
  NoContent = 204,
  MovedPermanently = 301,
  Found = 302,
  NotModified = 304,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  Conflict = 409,
  InternalServerError = 500,
}

const taskActions = ["log-work", "unassign", "assign"] as const;
export function getResourceActionFromReq(
  method: string,
  path: string,
  includeResourceInstance: boolean,
): { resource: string; action: string } {
  const getAction = () => {
    for (const res of taskActions) {
      if (path.includes(res)) {
        return res;
      }
    }

    switch (method.toUpperCase()) {
      case "POST":
        return "create";
      case "PUT":
        return "update";
      case "GET":
        return "read";
      case "DELETE":
        return "delete";
      default:
        return "";
    }
  };

  const getResource = () => {
    const pathParts = path.split("/");
    const resourceInstanceMatch = path.match(/[0-7][0-9A-HJKMNP-TV-Z]{25}/gm);

    const resourceName = sentenceCase(pathParts[2].slice(0, -1));
    let resourceInstance = "";
    if (includeResourceInstance) {
      resourceInstance =
        resourceInstanceMatch && resourceInstanceMatch.length > 0
          ? `:${resourceInstanceMatch[0]}`
          : "";
    }

    return `${resourceName}${resourceInstance}`;
  };

  return { resource: getResource(), action: getAction() };
}

export function getDeleteMessage(success: boolean, resource: string): string {
  return success
    ? `${resource} deleted successfully`
    : `Failed to delete ${resource}, it is not exists or already deleted`;
}
