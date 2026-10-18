import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

function isDecimalLike(value: unknown): value is { toNumber(): number } {
  if (typeof value !== "object" || value === null || value instanceof Date) return false;
  const obj = value as Record<string, unknown>;
  // Decimal.js internal shape: { s, e, d } — present on all Prisma Decimal instances
  return (
    typeof obj.toNumber === "function" &&
    typeof obj.s === "number" &&
    typeof obj.e === "number" &&
    Array.isArray(obj.d)
  );
}

function serializeDecimals(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (isDecimalLike(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(serializeDecimals);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeDecimals(v);
    }
    return out;
  }
  return value;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const path = request.url || request.path || "";

    const message = `Operation completed successfully`;

    return next.handle().pipe(
      map((data) => {
        data = serializeDecimals(data);
        /**
         * Skip wrapping for auth endpoints (login/register responses have specific format)
         */
        if (path.includes("/auth/login") || path.includes("/auth/register")) {
          /**
           * Auth responses should be wrapped to maintain consistency
           * But ensure user object is properly included
           */
          if (data && typeof data === "object" && "access_token" in data && "user" in data) {
            return { success: true, message, data };
          }
        }

        /**
         * If response is already in the correct format, return as-is
         */
        if (data && typeof data === "object" && "data" in data && "meta" in data) {
          return { success: true, message, ...data };
        }

        /**
         * If response has a message property, use it
         */
        if (data && typeof data === "object" && "message" in data) {
          return {
            success: true,
            message: data.message,
            data: data.data || (Object.keys(data).length > 1 ? data : null),
          };
        }

        /**
         * Default success response
         */
        return { success: true, message, data: data };
      }),
    );
  }
}
