import { LoginAccess } from "@prisma/tenant-client";
import { IBaseSuperAdmin } from "src/super-admin/utils/interfaces";

export interface ResponseDto<T = any> {
  message: string;
  data?: T;
  meta?: IMeta;
}

export interface IMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IPagination {
  limit: number;
  skip: number;
}

export interface PayloadUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tenantId: string;
  roleId: string;
  role?: { name: string };
  loginAccess: LoginAccess;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayloadSuperAdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestWithUser extends Request {
  user: PayloadUser;
}

export interface RequestWithSuperAdminUser extends Request {
  user: IBaseSuperAdmin;
}
