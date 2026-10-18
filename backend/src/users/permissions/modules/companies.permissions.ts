export const COMPANIES_PERMISSIONS = {
  "companies.create": { module: "companies", action: "create", description: "Create companies" },
  "companies.read": { module: "companies", action: "read", description: "View companies" },
  "companies.update": { module: "companies", action: "update", description: "Update companies" },
  "companies.delete": { module: "companies", action: "delete", description: "Delete companies" },
} as const;
