import { BadRequestException, ConflictException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { PayrollStatus, SalaryRevisionStatus } from "@prisma/tenant-client";
import { PayrollService } from "./payroll.service";
import { GlPostingKind, GlSourceType } from "src/financial/gl-posting/utils/enums";

function buildService(overrides?: Record<string, any>) {
  const payrollRepository = {
    findById: jest.fn(),
    findByEmployeeAndPeriod: jest.fn(),
    findEmployeeIdByUserId: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    addBonus: jest.fn(),
    getActiveContract: jest.fn(),
    getAttendanceMetrics: jest.fn(),
  };
  const holidayService = { countInPeriod: jest.fn().mockResolvedValue(0) };
  const leaveRequestService = {
    getMetricsForPeriod: jest.fn().mockResolvedValue({ unpaidLeaveDays: 0, leaveDates: [] }),
  };
  const hrSettingsService = { getSettings: jest.fn().mockResolvedValue({ weeklyOffDays: [0] }) };
  const loanRequestService = {
    getInstallmentsForMonth: jest.fn().mockResolvedValue([]),
    payInstallment: jest.fn(),
  };
  const auditContext = { setOldValue: jest.fn() };
  const permissionsService = { getUserEffectivePermissions: jest.fn().mockResolvedValue(["payroll.view"]) };
  const glPostingService = { postBalancedEntry: jest.fn().mockResolvedValue({ id: "je-1" }) };

  Object.assign(payrollRepository, overrides?.payrollRepository);
  Object.assign(loanRequestService, overrides?.loanRequestService);
  Object.assign(glPostingService, overrides?.glPostingService);

  const service = new PayrollService(
    payrollRepository as any,
    holidayService as any,
    leaveRequestService as any,
    hrSettingsService as any,
    loanRequestService as any,
    auditContext as any,
    permissionsService as any,
    glPostingService as any,
  );

  return { service, payrollRepository, loanRequestService, glPostingService };
}

describe("PayrollService", () => {
  it("refuses to pay a payroll that is not APPROVED", async () => {
    const { service, payrollRepository } = buildService();
    payrollRepository.findById.mockResolvedValue({
      id: "pay-1",
      status: PayrollStatus.DRAFT,
      netPay: 1000,
    });

    await expect(service.pay("pay-1")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("posts a salary journal then flips APPROVED → PAID", async () => {
    const { service, payrollRepository, glPostingService } = buildService();
    const approved = {
      id: "pay-1",
      status: PayrollStatus.APPROVED,
      netPay: 12000,
      paidMonth: "2026-09",
      employeeId: "emp-1",
    };
    payrollRepository.findById
      .mockResolvedValueOnce(approved)
      .mockResolvedValueOnce({ ...approved, status: PayrollStatus.PAID });
    payrollRepository.updateStatus.mockResolvedValue(1);

    await service.pay("pay-1");

    expect(glPostingService.postBalancedEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: GlSourceType.PAYROLL,
        sourceId: "pay-1",
        postingKind: GlPostingKind.PAY_SALARY,
      }),
    );
    expect(payrollRepository.updateStatus).toHaveBeenCalledWith(
      "pay-1",
      PayrollStatus.APPROVED,
      PayrollStatus.PAID,
      undefined,
      expect.any(Date),
    );
  });

  it("is idempotent: a second pay does not post another journal", async () => {
    const { service, payrollRepository, glPostingService } = buildService();
    payrollRepository.findById.mockResolvedValue({
      id: "pay-1",
      status: PayrollStatus.PAID,
      netPay: 12000,
    });

    await expect(service.pay("pay-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(glPostingService.postBalancedEntry).not.toHaveBeenCalled();
  });

  it("conflicts when two payers race the status flip", async () => {
    const { service, payrollRepository } = buildService();
    payrollRepository.findById.mockResolvedValue({
      id: "pay-1",
      status: PayrollStatus.APPROVED,
      netPay: 500,
      paidMonth: "2026-09",
      employeeId: "emp-1",
    });
    payrollRepository.updateStatus.mockResolvedValue(0);

    await expect(service.pay("pay-1")).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects two PENDING loan installments in the same paidMonth", async () => {
    const { service, payrollRepository, loanRequestService } = buildService();
    payrollRepository.getActiveContract.mockResolvedValue({
      allowances: [],
      salaryRevisions: [{ status: SalaryRevisionStatus.CURRENT, baseSalary: new Decimal(30000) }],
    });
    payrollRepository.getAttendanceMetrics.mockResolvedValue({ absentDays: 0, timingMinutes: 0 });
    loanRequestService.getInstallmentsForMonth.mockResolvedValue([
      { id: "i1", amount: new Decimal(1000) },
      { id: "i2", amount: new Decimal(1000) },
    ]);

    await expect(
      service.preview({
        employeeIds: ["emp-1"],
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        paidMonth: "2026-09",
      } as any),
    ).rejects.toThrow(/Only one deduction per month/);
  });

  it("refuses a duplicate payroll for the same employee and period", async () => {
    const { service, payrollRepository } = buildService();
    payrollRepository.findByEmployeeAndPeriod.mockResolvedValue({ id: "existing" });

    await expect(
      service.create(
        {
          employeeIds: ["emp-1"],
          periodStart: "2026-09-01",
          periodEnd: "2026-09-30",
          paidMonth: "2026-09",
        } as any,
        "user-1",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
