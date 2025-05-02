export const MimeTypeJson = "application/json";

export type UserRole = "Admin" | "Manager" | "Developer";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type ResourceAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "assign"
  | "unassigned"
  | "log-work"
  | "reject";

export enum ResourceNames {
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

const taskResources = ["assign", "unassigned", "log-work"] as const;
export function getResourceFromReq(
  method: string,
  path: string,
): ResourceAction {
  for (const res of taskResources) {
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
      return "reject";
  }
}

export function getDeleteMessage(success: boolean, resource: string): string {
  return success
    ? `${resource} deleted successfully`
    : `Failed to delete ${resource}, it is not exists or already deleted`;
}
