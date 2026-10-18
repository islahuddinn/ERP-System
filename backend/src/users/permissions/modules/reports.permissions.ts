export const REPORTS_PERMISSIONS = {
  "reports.view": {
    module: "reports",
    action: "view",
    description: "View reports",
  },
  "reports.view_all": {
    module: "reports",
    action: "view_all",
    description: "View all reports across the system",
  },
  "reports.export": {
    module: "reports",
    action: "export",
    description: "Export reports",
  },
} as const;
