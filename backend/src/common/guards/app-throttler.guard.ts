import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.LOAD_TEST_BYPASS_THROTTLE === "true") {
      return true;
    }

    return super.canActivate(context);
  }
}
