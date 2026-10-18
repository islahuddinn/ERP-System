import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EmployeeDocument, EmployeeStatus, LoginAccess, Prisma } from "@prisma/tenant-client";
import { EmployeeRepository } from "./employee.repository";
import { EmployeeDetail, EmployeeListItem } from "./utils/types";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { EmployeeFiltersDto } from "./dto/employee-filters.dto";
import { AttachEmployeeDocumentDto } from "./dto/attach-employee-document.dto";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { hashPassword } from "../../common/reuseable-functions/hashPassword";
import { RequestWithUser } from "../../common/interfaces";
import { AuditContextService } from "../../audit/audit-context.service";
import { CreateEmployeeData, CreateUserData } from "./utils/interfaces";

const STATUS_LOGIN_ACCESS_MAP: Record<EmployeeStatus, LoginAccess> = {
  [EmployeeStatus.ACTIVE]: LoginAccess.ENABLED,
  [EmployeeStatus.INACTIVE]: LoginAccess.DISABLED,
  [EmployeeStatus.TERMINATED]: LoginAccess.DISABLED,
  [EmployeeStatus.ONBOARDING]: LoginAccess.DISABLED,
};

@Injectable()
export class EmployeeService {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listEmployees(
    employeeFiltersDto: EmployeeFiltersDto,
  ): Promise<PaginatedResponse<EmployeeListItem>> {
    return this.employeeRepository.findAll(employeeFiltersDto);
  }

  async dropdown(): Promise<
    {
      id: string;
      employeeCode: string;
      user: { id: string; firstName: string; lastName: string } | null;
    }[]
  > {
    return this.employeeRepository.dropdown();
  }

  async distributorDropdown(): Promise<
    {
      id: string;
      employeeCode: string;
      user: { id: string; firstName: string; lastName: string; email: string | null } | null;
    }[]
  > {
    return this.employeeRepository.distributorDropdown();
  }

  async getEmployee(employeeId: string): Promise<EmployeeDetail> {
    return this.checkExistence(employeeId);
  }

  async createEmployee(
    createEmployeeDto: CreateEmployeeDto,
    req: RequestWithUser,
  ): Promise<EmployeeDetail> {
    const {
      loginAccess,
      password,
      firstName,
      lastName,
      email,
      phone,
      roleId,
      shiftId,
      employeeCode,
      dateOfJoining,
      status,
    } = createEmployeeDto;

    if (loginAccess === LoginAccess.ENABLED && !email) {
      throw new BadRequestException(`Email is required when loginAccess is ${LoginAccess.ENABLED}`);
    }

    if (loginAccess === LoginAccess.ENABLED && !password) {
      throw new BadRequestException(
        `Password is required when loginAccess is ${LoginAccess.ENABLED}`,
      );
    }

    if (loginAccess === LoginAccess.ENABLED && !roleId) {
      throw new BadRequestException(
        `Role ID is required when loginAccess is ${LoginAccess.ENABLED}`,
      );
    }

    const existing = await this.employeeRepository.findByEmployeeCode(employeeCode);

    if (existing) {
      throw new BadRequestException(`Employee code ${employeeCode} is already in use`);
    }

    const hashedPassword = password ? await hashPassword(password) : null;

    // A User record is always created so the employee's name/contact details are
    // persisted even without login access — loginAccess alone gates whether they can log in.
    const userPayload: CreateUserData = {
      firstName,
      lastName,
      email: email ?? null,
      phone: phone ?? null,
      password: hashedPassword,
      roleId: roleId ?? null,
      loginAccess,
    };

    const employeePayload: CreateEmployeeData = {
      employeeCode,
      dateOfJoining: new Date(dateOfJoining),
      status: status ?? EmployeeStatus.ACTIVE,
      shiftId,
      createdById: req.user.id,
    };

    try {
      return await this.employeeRepository.createUserAndEmployee(userPayload, employeePayload);
    } catch (error) {
      this.throwOnEmployeeUniqueViolation(error);
    }
  }

  async updateEmployee(
    employeeId: string,
    updateEmployeeDto: UpdateEmployeeDto,
    req: RequestWithUser,
  ): Promise<EmployeeDetail> {
    const existing = await this.checkExistence(employeeId);

    if (existing.userId === req.user.id) {
      throw new ForbiddenException("You cannot update your own employee profile");
    }

    // Capture the pre-update snapshot so the audit interceptor can build a diff.
    // Without this the diff is null and the UPDATE log is skipped entirely.
    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.employeeCode);

    const {
      firstName,
      lastName,
      email,
      phone,
      roleId,
      loginAccess,
      password,
      employeeCode,
      dateOfJoining,
      status,
      shiftId,
    } = updateEmployeeDto;

    // Only require a password when login access is being TURNED ON for a user
    // who isn't already enabled (i.e. a fresh login). Editing an already-enabled
    // employee and leaving the password blank must keep the existing password —
    // re-sending loginAccess=ENABLED on an unchanged account should not force a
    // password re-entry.
    const isEnablingFreshLogin =
      loginAccess === LoginAccess.ENABLED && existing.user?.loginAccess !== LoginAccess.ENABLED;
    if (isEnablingFreshLogin && !password) {
      throw new BadRequestException("Password is required when enabling login access");
    }

    // The status→loginAccess map only ever FORCES a more restrictive access
    // (INACTIVE/TERMINATED/ONBOARDING must not keep an active login) — it must
    // never force ENABLED back on. The edit form always submits the unchanged
    // `status` alongside an explicit `loginAccess` change, so previously
    // `derivedLoginAccess ?? loginAccess` re-enabled login access on every save
    // as long as status stayed ACTIVE, silently reverting the user's explicit
    // choice to disable/suspend it (#28).
    const statusForcesDisabledAccess =
      !!status && STATUS_LOGIN_ACCESS_MAP[status] === LoginAccess.DISABLED;

    const hasUserFields = Boolean(
      firstName ||
      lastName ||
      email !== undefined ||
      phone !== undefined ||
      roleId ||
      loginAccess ||
      statusForcesDisabledAccess,
    );

    if (hasUserFields && existing.userId) {
      const userUpdate: Prisma.UserUncheckedUpdateInput = {};

      if (firstName) userUpdate.firstName = firstName;
      if (lastName) userUpdate.lastName = lastName;
      // Use "!== undefined" (not truthy) so an explicit null/"" clears the field —
      // a truthy check silently drops the removal and the old email reappears (#12).
      if (email !== undefined) userUpdate.email = email;
      if (phone !== undefined) userUpdate.phone = phone;
      if (roleId) userUpdate.roleId = roleId;
      if (password) userUpdate.password = await hashPassword(password);

      const effectiveLoginAccess = statusForcesDisabledAccess ? LoginAccess.DISABLED : loginAccess;
      if (effectiveLoginAccess) userUpdate.loginAccess = effectiveLoginAccess;

      try {
        await this.employeeRepository.updateUser(existing.userId, userUpdate);
      } catch (error) {
        this.throwOnEmployeeUniqueViolation(error);
      }
    }

    const updateData: Prisma.EmployeeUncheckedUpdateInput = {
      ...(employeeCode && { employeeCode }),
      ...(dateOfJoining && { dateOfJoining: new Date(dateOfJoining) }),
      ...(status && { status }),
      ...(shiftId !== undefined && { shiftId }),
    };

    try {
      return await this.employeeRepository.update(employeeId, updateData);
    } catch (error) {
      this.throwOnEmployeeUniqueViolation(error);
    }
  }

  /**
   * Translates a Prisma unique-constraint (P2002) violation raised while creating
   * or updating an employee (and its linked User) into a clean 409. The constraint
   * target tells us which field collided — phone (#20), email, or employeeCode — so
   * the client gets a precise message. Always routes through the shared
   * handlePrismaUniqueError helper (rule 6); never throws ConflictException inline.
   */
  private throwOnEmployeeUniqueViolation(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = error.meta?.target;
      const targetText = Array.isArray(target) ? target.join(",") : String(target ?? "");

      if (targetText.includes("phone")) {
        handlePrismaUniqueError(error, "A user with this phone number already exists");
      }
      if (targetText.includes("email")) {
        handlePrismaUniqueError(error, "A user with this email already exists");
      }
      if (targetText.includes("employeeCode") || targetText.includes("employee_code")) {
        handlePrismaUniqueError(error, "Employee code is already in use");
      }
    }

    // Non-P2002 or an unrecognised target — delegate so the original error (or a
    // generic duplicate message) is surfaced unchanged.
    handlePrismaUniqueError(error);
  }

  async attachDocument(
    employeeId: string,
    attachEmployeeDocumentDto: AttachEmployeeDocumentDto,
    createdById: string,
  ): Promise<EmployeeDocument> {
    await this.checkExistence(employeeId);

    return this.employeeRepository.attachDocument(
      employeeId,
      attachEmployeeDocumentDto.documentType,
      attachEmployeeDocumentDto.fileUrl,
      createdById,
    );
  }

  async checkExistence(employeeId: string): Promise<EmployeeDetail> {
    const employee = await this.employeeRepository.findById(employeeId);

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    return employee;
  }

  // Resolves the logged-in user to their own Employee record — used wherever
  // an action (booking an order, taking a delivery, collecting recovery)
  // must be attributed to the salesperson who is actually logged in, rather
  // than trusting a client-supplied salesPersonId.
  async getEmployeeIdForUser(userId: string): Promise<string> {
    const employee = await this.employeeRepository.findByUserId(userId);

    if (!employee) {
      throw new ForbiddenException("Only employees can perform this action");
    }

    return employee.id;
  }
}
