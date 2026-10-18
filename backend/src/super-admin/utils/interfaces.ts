export interface IBaseSuperAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBaseSuperAdminRes {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date;
}

export interface IAuthSuperAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface IAuthSuperAdminAccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  type: string;
}

export interface ISuperAdminLoginResponse {
  access_token: string;
  user: IBaseSuperAdminRes;
}

export interface ICreateTenantDbAndAdminUserDto {
  tenantName: string;
  dbUrl: string;
  email: string;
  password: string;
  requestId: string;
  shortTenantId: string;
}

export interface ICreateTenantDbAndAdminResponse {
  encryptedUrl: string;
  databaseName: string;
}

export interface ITenantDbConnectionResponse {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface IUpdateTenantDbConnectionResponse {
  encryptedUrl: string;
  databaseName: string;
}
