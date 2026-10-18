import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger("HTTP");

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = request;
    const userAgent = request.get("user-agent") || "";
    const startTime = Date.now();

    // #region agent log
    if (originalUrl?.includes("/plants") || originalUrl?.includes("/machines")) {
      const fs = require("fs");
      const logPath = "c:\\Users\\Mubeen\\factory_distribution_system\\.cursor\\debug.log";
      try {
        const logEntry =
          JSON.stringify({
            location: "logger.middleware.ts:12",
            message: "LoggerMiddleware: Request received",
            data: { method, originalUrl, path: request.path, url: request.url },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "E",
          }) + "\n";
        fs.appendFileSync(logPath, logEntry, "utf8");
      } catch (e) {}
    }
    // #endregion

    response.on("finish", () => {
      const { statusCode } = response;
      const contentLength = response.get("content-length");
      const responseTime = Date.now() - startTime;

      const logMessage = `${method} ${originalUrl} ${statusCode} ${contentLength || 0}b - ${responseTime}ms - ${userAgent} - ${ip}`;

      // #region agent log
      if (originalUrl?.includes("/plants") || originalUrl?.includes("/machines")) {
        const fs = require("fs");
        const logPath = "c:\\Users\\Mubeen\\factory_distribution_system\\.cursor\\debug.log";
        try {
          const logEntry =
            JSON.stringify({
              location: "logger.middleware.ts:28",
              message: "LoggerMiddleware: Response sent",
              data: { method, originalUrl, statusCode, responseTime },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "E",
            }) + "\n";
          fs.appendFileSync(logPath, logEntry, "utf8");
        } catch (e) {}
      }
      // #endregion

      if (statusCode >= 500) {
        this.logger.error(logMessage);
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }
    });

    next();
  }
}
