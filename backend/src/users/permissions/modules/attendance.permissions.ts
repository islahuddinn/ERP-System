export const ATTENDANCE_PERMISSIONS = {
  "attendance.view_all": {
    module: "attendance",
    action: "view_all",
    description: "View all employees attendance records",
  },
  "attendance.manage": {
    module: "attendance",
    action: "manage",
    description: "Create, update, delete and correct attendance records",
  },
} as const;
