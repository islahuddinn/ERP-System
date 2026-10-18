import { BadRequestException } from "@nestjs/common";
import { LoanInstallmentStatus, LoanRequestStatus } from "@prisma/tenant-client";
import { LoanRequestService } from "./loan-request.service";

function buildService() {
  const loanRequestRepository = {
    findById: jest.fn(),
    markInstallmentPaid: jest.fn(),
    getInstallmentsForMonth: jest.fn(),
  };
  const auditContext = { setOldValue: jest.fn() };
  const permissionsService = { hasPermission: jest.fn() };
  const service = new LoanRequestService(
    loanRequestRepository as any,
    permissionsService as any,
    {} as any,
    {} as any,
    auditContext as any,
  );
  return { service, loanRequestRepository };
}

describe("LoanRequestService.payInstallment", () => {
  it("refuses to pay an installment twice", async () => {
    const { service, loanRequestRepository } = buildService();
    loanRequestRepository.findById.mockResolvedValue({
      id: "loan-1",
      status: LoanRequestStatus.APPROVED,
      installments: [{ id: "inst-1", status: LoanInstallmentStatus.PAID }],
    });

    await expect(service.payInstallment("loan-1", "inst-1")).rejects.toThrow(/already been paid/);
  });

  it("refuses installments on a loan that is not fully approved", async () => {
    const { service, loanRequestRepository } = buildService();
    loanRequestRepository.findById.mockResolvedValue({
      id: "loan-1",
      status: LoanRequestStatus.PENDING,
      installments: [{ id: "inst-1", status: LoanInstallmentStatus.PENDING }],
    });

    await expect(service.payInstallment("loan-1", "inst-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
