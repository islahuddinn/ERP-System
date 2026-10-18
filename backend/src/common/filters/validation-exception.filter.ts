import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException, Logger } from "@nestjs/common";
import { Response } from "express";

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();

    const errorResponse = exception.getResponse() as any;

    // #region agent log
    const fs = require("fs");
    const logPath = "c:\\Users\\Mubeen\\factory_distribution_system\\.cursor\\debug.log";
    const logEntry =
      JSON.stringify({
        location: "validation-exception.filter.ts:catch",
        message: "Validation error caught",
        data: {
          status,
          url: request.url,
          method: request.method,
          exceptionMessage: exception.message,
          errorResponse,
          validationErrors: Array.isArray(errorResponse?.message)
            ? errorResponse.message
            : errorResponse,
          requestBody: request.body,
          requestBodyKeys: request.body ? Object.keys(request.body) : [],
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      }) + "\n";
    try {
      fs.appendFileSync(logPath, logEntry);
    } catch (e) {}
    // #endregion

    this.logger.error(
      "VALIDATION ERROR CAUGHT:",
      JSON.stringify(
        {
          message: exception.message,
          status,
          url: request.url,
          method: request.method,
          validationErrors: errorResponse?.message || errorResponse,
          requestBody: request.body,
          requestBodyKeys: request.body ? Object.keys(request.body) : [],
          errorResponseFull: errorResponse,
        },
        null,
        2,
      ),
    );

    // Log detailed validation errors if available
    if (Array.isArray(errorResponse?.message)) {
      this.logger.debug("Detailed validation errors:", errorResponse.message);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
      details: errorResponse,
      validationErrors: Array.isArray(errorResponse?.message)
        ? errorResponse.message
        : errorResponse,
    });
  }
}
