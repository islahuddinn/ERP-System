export const PRODUCTION_LINES_PERMISSIONS = {
  "production_lines.create": { module: "production_lines", action: "create", description: "Create production lines" },
  "production_lines.read": { module: "production_lines", action: "read", description: "View production lines" },
  "production_lines.update": { module: "production_lines", action: "update", description: "Update production lines" },
  "production_lines.delete": { module: "production_lines", action: "delete", description: "Delete production lines" },
} as const;
