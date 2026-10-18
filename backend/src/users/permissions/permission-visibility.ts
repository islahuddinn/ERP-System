/**
 * Visibility filter for the "available permissions" list that the Add/Edit Role
 * screen reads (GET /permissions and /permissions/modules).
 *
 * These modules/keys still EXIST for enforcement — `@RequirePermission("…")`
 * continues to use the full PERMISSIONS map in permission.definitions.ts, and
 * the login/sidebar permission payload (getPermissionsByRoleIdGroupedByModule)
 * is intentionally NOT filtered, so a user who already holds one of these keeps
 * their access and nav. This list only hides them from being *assigned* to a new
 * role until the module is considered implemented.
 *
 * The backend is the single source of truth: the frontend renders exactly what
 * these endpoints return and keeps no allow/deny list of its own.
 */

// Hiding is currently DISABLED (reverted per request for QA Bug #12) — the Add
// Role screen and My Permissions tab now display every permission module the
// backend defines. To re-enable hiding later, add the module keys / permission
// names back to these sets; the filtering wiring in permissions.service.ts stays
// in place and picks them up automatically.
export const HIDDEN_PERMISSION_MODULES = new Set<string>([]);

// Individual permission keys hidden inside otherwise-visible modules.
export const HIDDEN_PERMISSION_KEYS = new Set<string>([]);

export const isHiddenPermissionModule = (module: string): boolean =>
  HIDDEN_PERMISSION_MODULES.has(module);

export const isHiddenPermissionKey = (name: string): boolean =>
  HIDDEN_PERMISSION_KEYS.has(name);
