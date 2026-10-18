import { LoginAccess } from "@prisma/tenant-client";

export interface IBaseUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tenantId: string;
  roleId: string;
  loginAccess: LoginAccess;
  role?: { name: string };
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserWithPassword extends IBaseUser {
  password: string;
}

export interface IValidateUserResponse extends IBaseUser {}
