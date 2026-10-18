// import { PrismaClient } from "@prisma/tenant-client";
// import * as bcrypt from "bcryptjs";

// const prisma = new PrismaClient();

// async function main() {
//   console.log("🌱 Starting minimal seed (users only)...");

//   // Create users only
//   const adminPassword = await bcrypt.hash("admin123", 10);
//   const staffPassword = await bcrypt.hash("staff123", 10);

//   const admin = await prisma.user.upsert({
//     where: { email: "admin@inventory.com" },
//     update: {},
//     create: {
//       name: "Admin User",
//       email: "admin@inventory.com",
//       password: adminPassword,
//       role: "ADMIN",
//     },
//   });

//   const staff = await prisma.user.upsert({
//     where: { email: "staff@inventory.com" },
//     update: {},
//     create: {
//       name: "Staff User",
//       email: "staff@inventory.com",
//       password: staffPassword,
//       role: "STAFF",
//     },
//   });

//   console.log("✅ Users created successfully!");

//   // ---------------------------------------------------------------------------
//   // HR CORE SEED (departments, positions, grades)
//   // ---------------------------------------------------------------------------
//   console.log("🌱 Seeding basic HR core data (departments, positions, grades)...");

//   const deptHeadOffice = await prisma.department.upsert({
//     where: { id: "00000000-0000-0000-0000-000000000001" },
//     update: {},
//     create: {
//       id: "00000000-0000-0000-0000-000000000001",
//       name: "Head Office",
//       description: "Head Office / Corporate",
//     },
//   });

//   await prisma.department.upsert({
//     where: { id: "00000000-0000-0000-0000-000000000002" },
//     update: {},
//     create: {
//       id: "00000000-0000-0000-0000-000000000002",
//       name: "Manufacturing",
//       description: "Manufacturing / Production",
//       parentDepartmentId: deptHeadOffice.id,
//     },
//   });

//   await prisma.position.upsert({
//     where: { id: "00000000-0000-0000-0000-000000000011" },
//     update: {},
//     create: {
//       id: "00000000-0000-0000-0000-000000000011",
//       title: "Operator",
//     },
//   });

//   await prisma.position.upsert({
//     where: { id: "00000000-0000-0000-0000-000000000012" },
//     update: {},
//     create: {
//       id: "00000000-0000-0000-0000-000000000012",
//       title: "Supervisor",
//     },
//   });

//   await prisma.grade.upsert({
//     where: { id: "00000000-0000-0000-0000-000000000021" },
//     update: {},
//     create: {
//       id: "00000000-0000-0000-0000-000000000021",
//       name: "G1",
//       level: 1,
//       salaryBandMin: "30000.00" as any,
//       salaryBandMax: "60000.00" as any,
//     },
//   });

//   await prisma.grade.upsert({
//     where: { id: "00000000-0000-0000-0000-000000000022" },
//     update: {},
//     create: {
//       id: "00000000-0000-0000-0000-000000000022",
//       name: "G2",
//       level: 2,
//       salaryBandMin: "60000.00" as any,
//       salaryBandMax: "120000.00" as any,
//     },
//   });

//   console.log("✅ HR core seed completed!");

//   // ---------------------------------------------------------------------------
//   // HR ATTENDANCE SEED (default shifts + sample roster)
//   // ---------------------------------------------------------------------------
//   console.log("🌱 Seeding HR attendance data (default shifts, sample rosters)...");

//   const tenantId = "test-tenant";

//   const generalShift = await (prisma as any).shift.upsert({
//     where: { id: "00000000-0000-0000-0000-000000000101" },
//     update: {},
//     create: {
//       id: "00000000-0000-0000-0000-000000000101",
//       tenantId,
//       name: "General",
//       startTime: new Date("2000-01-01T09:00:00.000Z"),
//       endTime: new Date("2000-01-01T17:00:00.000Z"),
//       gracePeriodMinutes: 10,
//       breakMinutes: 60,
//       isNightShift: false,
//       createdBy: admin.id,
//     },
//   });

//   const nightShift = await (prisma as any).shift.upsert({
//     where: { id: "00000000-0000-0000-0000-000000000102" },
//     update: {},
//     create: {
//       id: "00000000-0000-0000-0000-000000000102",
//       tenantId,
//       name: "Night",
//       startTime: new Date("2000-01-01T22:00:00.000Z"),
//       endTime: new Date("2000-01-02T06:00:00.000Z"),
//       gracePeriodMinutes: 5,
//       breakMinutes: 30,
//       isNightShift: true,
//       createdBy: admin.id,
//     },
//   });

//   // Create two sample employees (HR Core is not tenant-scoped in this codebase)
//   const emp1 = await (prisma as any).employee.upsert({
//     where: { id: "00000000-0000-0000-0000-000000000201" },
//     update: {},
//     create: {
//       id: "00000000-0000-0000-0000-000000000201",
//       employeeCode: "EMP-ATT-001",
//       firstName: "Ayesha",
//       lastName: "Khan",
//       email: "ayesha.khan@example.com",
//       phone: "03000000001",
//       dateOfJoining: new Date("2026-01-01T00:00:00.000Z"),
//       status: "ACTIVE",
//       departmentId: deptHeadOffice.id,
//       createdBy: admin.id,
//     },
//   });

//   const emp2 = await (prisma as any).employee.upsert({
//     where: { id: "00000000-0000-0000-0000-000000000202" },
//     update: {},
//     create: {
//       id: "00000000-0000-0000-0000-000000000202",
//       employeeCode: "EMP-ATT-002",
//       firstName: "Hassan",
//       lastName: "Ali",
//       email: "hassan.ali@example.com",
//       phone: "03000000002",
//       dateOfJoining: new Date("2026-01-15T00:00:00.000Z"),
//       status: "ACTIVE",
//       departmentId: deptHeadOffice.id,
//       createdBy: admin.id,
//     },
//   });

//   const today = new Date();
//   const todayStr = today.toISOString().slice(0, 10);

//   await (prisma as any).roster.upsert({
//     where: { employeeId_date: { employeeId: emp1.id, date: new Date(todayStr) } },
//     update: { shiftId: generalShift.id },
//     create: {
//       tenantId,
//       employeeId: emp1.id,
//       shiftId: generalShift.id,
//       date: new Date(todayStr),
//       createdBy: admin.id,
//     },
//   });

//   await (prisma as any).roster.upsert({
//     where: { employeeId_date: { employeeId: emp2.id, date: new Date(todayStr) } },
//     update: { shiftId: nightShift.id },
//     create: {
//       tenantId,
//       employeeId: emp2.id,
//       shiftId: nightShift.id,
//       date: new Date(todayStr),
//       createdBy: admin.id,
//     },
//   });

//   console.log("✅ HR attendance seed completed!");

//   // ---------------------------------------------------------------------------
//   // HR LEAVE SEED (default leave types, balances, sample requests)
//   // ---------------------------------------------------------------------------
//   console.log("🌱 Seeding HR leave data (leave types, balances, sample requests)...");

//   const annualLeave = await (prisma as any).leaveType.upsert({
//     where: { id: "00000000-0000-0000-0000-000000000301" },
//     update: {},
//     create: {
//       id: "00000000-0000-0000-0000-000000000301",
//       tenantId,
//       name: "Annual Leave",
//       description: "Paid annual leave",
//       maxDaysPerYear: 20,
//       carryForwardAllowed: true,
//       requiresApproval: true,
//       createdBy: admin.id,
//     },
//   });

//   const sickLeave = await (prisma as any).leaveType.upsert({
//     where: { id: "00000000-0000-0000-0000-000000000302" },
//     update: {},
//     create: {
//       id: "00000000-0000-0000-0000-000000000302",
//       tenantId,
//       name: "Sick Leave",
//       description: "Sick leave",
//       maxDaysPerYear: 10,
//       carryForwardAllowed: false,
//       requiresApproval: true,
//       createdBy: admin.id,
//     },
//   });

//   const year = new Date().getFullYear();

//   await (prisma as any).leaveBalance.upsert({
//     where: {
//       employeeId_leaveTypeId_year: { employeeId: emp1.id, leaveTypeId: annualLeave.id, year },
//     },
//     update: {},
//     create: {
//       tenantId,
//       employeeId: emp1.id,
//       leaveTypeId: annualLeave.id,
//       totalDays: 20,
//       usedDays: 0,
//       remainingDays: 20,
//       year,
//       createdBy: admin.id,
//     },
//   });

//   await (prisma as any).leaveBalance.upsert({
//     where: {
//       employeeId_leaveTypeId_year: { employeeId: emp2.id, leaveTypeId: annualLeave.id, year },
//     },
//     update: {},
//     create: {
//       tenantId,
//       employeeId: emp2.id,
//       leaveTypeId: annualLeave.id,
//       totalDays: 20,
//       usedDays: 2,
//       remainingDays: 18,
//       year,
//       createdBy: admin.id,
//     },
//   });

//   // sample leave request (pending) for emp1, approved by emp2 (as manager surrogate for demo)
//   const req = await (prisma as any).leaveRequest.upsert({
//     where: { id: "00000000-0000-0000-0000-000000000401" },
//     update: {},
//     create: {
//       id: "00000000-0000-0000-0000-000000000401",
//       tenantId,
//       employeeId: emp1.id,
//       leaveTypeId: annualLeave.id,
//       startDate: new Date(todayStr),
//       endDate: new Date(todayStr),
//       totalDays: 1,
//       reason: "Personal work",
//       status: "PENDING",
//       createdBy: admin.id,
//     },
//   });

//   await (prisma as any).leaveApproval.upsert({
//     where: { id: "00000000-0000-0000-0000-000000000501" },
//     update: {},
//     create: {
//       id: "00000000-0000-0000-0000-000000000501",
//       tenantId,
//       leaveRequestId: req.id,
//       approverId: emp2.id,
//       approvalLevel: 1,
//       status: "PENDING",
//       remarks: null,
//       createdBy: admin.id,
//     },
//   });

//   console.log("✅ HR leave seed completed!");
//   console.log("🎉 Minimal seed completed!");
//   console.log("\n📋 Login Credentials:");
//   console.log("Admin: admin@inventory.com / admin123");
//   console.log("Staff: staff@inventory.com / staff123");
// }

// main()
//   .catch((e) => {
//     console.error("❌ Seed failed:", e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
