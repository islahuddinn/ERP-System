import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { PayloadUser, RequestWithUser } from "src/common/interfaces";

/**
 * Decorator to extract the current authenticated user from the request
 * Usage: @CurrentUser() user
 */
// export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
//   const request = ctx.switchToHttp().getRequest();
//   return request.user;
// });

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): PayloadUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();

    return request.user;
  },
);
