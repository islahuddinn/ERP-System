import { SetMetadata } from "@nestjs/common";
import { PermissionName } from "../permissions/permission.definitions";

export const PERMISSIONS_KEY = "permissions";

export const RequirePermission = (...permissions: PermissionName[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
