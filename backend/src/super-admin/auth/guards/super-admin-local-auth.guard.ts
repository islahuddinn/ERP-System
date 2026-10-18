import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class SuperAdminLocalAuthGuard extends AuthGuard("super-admin-local") {}
