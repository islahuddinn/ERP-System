import { LoginAccess } from "@prisma/tenant-client";
import { EPayloadType } from "src/common/enums";

export interface IAccessTokenPayload {
  sub: string;
  email: string;
  roleId: string;
  tenantId: string;
  type: EPayloadType;
  loginAccess: LoginAccess;
}

export interface ILoginUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  loginAccess: LoginAccess;
  role?: string;
}

export interface ILoginResponse {
  user: ILoginUser;
  access_token: string;
  permissions: Record<string, string[]>;
}
