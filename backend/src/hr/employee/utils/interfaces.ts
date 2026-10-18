import { EmployeeStatus, LoginAccess } from "@prisma/tenant-client";

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  password?: string | null;
  roleId?: string | null;
  loginAccess: LoginAccess;
}

export interface CreateEmployeeData {
  employeeCode: string;
  dateOfJoining: Date;
  status: EmployeeStatus;
  shiftId: string;
  createdById: string;
}
