// A convenience permission spanning branch-product-price, branch-stock,
// branch-stock-request, and branch-stock-transfer — the day-to-day branch
// worker workflow (check stock, request/approve/dispatch/receive product,
// set my own branch's prices) touches all four modules, and requiring four
// separate permission grants for one job is exactly the kind of setup pain
// that leads to a forgotten checkbox breaking someone's workflow. Every
// route below also still accepts its own specific permission, so an org
// that wants tight per-action control can still grant those individually
// instead of this umbrella one. branch-product-price.manage-factory is
// deliberately NOT covered here — that's a Factory-level action, not part
// of ordinary branch work.
export const BRANCH_STOCK_OPERATIONS_PERMISSIONS = {
  "branch-stock-operations.view": {
    module: "branch-stock-operations",
    action: "view",
    description: "View branch stock, prices, requests, and transfers",
  },
  "branch-stock-operations.manage": {
    module: "branch-stock-operations",
    action: "manage",
    description:
      "Full day-to-day branch stock workflow: set my branch's prices, request/approve/reject stock, dispatch/confirm-receipt transfers",
  },
} as const;
