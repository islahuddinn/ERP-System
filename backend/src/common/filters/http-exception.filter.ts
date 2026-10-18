import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = "Internal server error";
    let error = "Internal Server Error";
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "object") {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
        details = (exceptionResponse as any).details;
      } else {
        message = exceptionResponse;
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      // Never expose internal error details to the client
      message = "Internal server error";
      error = "Internal Server Error";
      this.logger.error("Full error details:", {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      });
    }

    // Sanitize body to remove sensitive information before logging
    const sanitizedBody = { ...request.body };
    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "access_token",
      "refresh_token",
      "encryptedPassword",
    ];
    sensitiveFields.forEach((field) => {
      if (field in sanitizedBody) sanitizedBody[field] = "[REDACTED]";
    });

    // Log the error with full details
    const errorDetails = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      user: (request as any).user?.id,
      body: sanitizedBody,
      validationErrors: Array.isArray(message) ? message : [message],
    };

    // Add full exception details for debugging
    if (exception instanceof Error) {
      errorDetails["exceptionName"] = exception.constructor.name;
      errorDetails["exceptionMessage"] = exception.message;
      errorDetails["stack"] = exception.stack;
    }

    // Log with full details - use error level for visibility
    this.logger.error(`ERROR: ${request.method} ${request.url}`);
    this.logger.error(`Error Details: ${JSON.stringify(errorDetails, null, 2)}`);

    // Standardized error response format
    const errorResponse = {
      success: false,
      message: Array.isArray(message) ? message.join(", ") : message,
      errorCode: error,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }
}
