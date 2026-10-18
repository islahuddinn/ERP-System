// --- CRITICAL: Set environment variables BEFORE any imports ---
// Prisma v7 reads engine type at module load time, so this MUST be first
// Force binary engine type - this MUST be set before PrismaClient is imported
process.env.PRISMA_CLIENT_ENGINE_TYPE = "binary";

import { NestFactory } from "@nestjs/core";
import { ValidationPipe, BadRequestException, Logger } from "@nestjs/common";
import { ValidationError } from "class-validator";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ValidationExceptionFilter } from "./common/filters/validation-exception.filter";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import { PrismaExceptionFilter } from "./common/filters/prisma-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { loggerConfig } from "./config/logger.config";

// --- EARLY ENVIRONMENT SYNC (Must be before any NestJS imports) ---
console.log("🚀 [System] Starting backend initialization...");
console.log(`🔧 [System] PRISMA_CLIENT_ENGINE_TYPE=${process.env.PRISMA_CLIENT_ENGINE_TYPE}`);
console.log(
  `🔗 [System] DATABASE_URL configured: ${process.env.DATABASE_URL ? "✅ Set" : "❌ Missing"}`,
);

// Engine type is configured in schema.prisma (engineType = "binary")
if (!process.env.DATABASE_URL && process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
  console.log("🔗 [System] Synced DATABASE_URL from DATABASE_PUBLIC_URL");
}
if (!process.env.MASTER_DATABASE_URL && process.env.DATABASE_URL) {
  process.env.MASTER_DATABASE_URL = process.env.DATABASE_URL;
  console.log("🔗 [System] Synced MASTER_DATABASE_URL from DATABASE_URL");
}

/**
 * Validate required environment variables on startup
 */
function validateEnvironmentVariables() {
  const logger = new Logger("Bootstrap");
  const requiredVars = ["JWT_SECRET", "ENCRYPTION_KEY"];

  const missing: string[] = [];
  const warnings: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (!process.env.MASTER_DATABASE_URL && !process.env.DATABASE_URL) {
    missing.push("MASTER_DATABASE_URL (or DATABASE_URL)");
  }

  if (missing.length > 0) {
    logger.error(`❌ CRITICAL: Missing required variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

function parseAllowedOrigins(values: Array<string | undefined>): string[] {
  const origins = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    for (const part of value.split(",")) {
      const origin = part.trim().replace(/\/+$/, "");
      if (origin) origins.add(origin);
    }
  }
  return [...origins];
}

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  try {
    validateEnvironmentVariables();

    const app = await NestFactory.create(AppModule, {
      logger: loggerConfig,
      abortOnError: false, // Prevents silent crashes during init
    });

    app.use((req: { method?: string; path?: string; url?: string }, res: { json: (body: unknown) => void }, next: () => void) => {
      const path = req.path || req.url?.split("?")[0] || "";
      if (req.method === "GET" && (path === "/" || path === "")) {
        res.json({
          success: true,
          message: "ERP API is running",
          health: "/api/health",
          docs: "/api/docs",
        });
        return;
      }
      next();
    });

    app.setGlobalPrefix("api");

    const exactAllowedOrigins = parseAllowedOrigins([
      process.env.CORS_ORIGIN,
      process.env.FRONTEND_URL,
      process.env.FRONTEND_ORIGIN,
      "http://localhost:3000",
      "https://factory-distribution-system-jxak.vercel.app",
    ]);
    const privateOriginRe =
      /^https?:\/\/(localhost|127(\.\d{1,3}){3}|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})(:\d+)?$/;
    logger.log(`CORS allow-list: ${exactAllowedOrigins.join(", ") || "(none — set CORS_ORIGIN to your frontend URL)"}`);

    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || exactAllowedOrigins.includes(origin) || privateOriginRe.test(origin)) {
          return callback(null, true);
        }
        logger.warn(`CORS blocked origin: ${origin}`);
        return callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Tenant-Id",
        "x-tenant-id",
        "ngrok-skip-browser-warning",
      ],
    });

    const flattenValidationErrors = (errors: ValidationError[], parentPath = ""): string[] => {
      const messages: string[] = [];
      for (const err of errors) {
        const path = parentPath ? `${parentPath}.${err.property}` : err.property;
        if (err.children && err.children.length > 0) {
          messages.push(...flattenValidationErrors(err.children, path));
        } else {
          const isEnumError = "isEnum" in (err.constraints || {});
          if (isEnumError) {
            const enumMsg = err.constraints!.isEnum;
            const allowedMatch = enumMsg.match(/following values: (.+)$/);
            const allowed = allowedMatch ? allowedMatch[1] : "";
            const received =
              err.value !== undefined && err.value !== null
                ? ` Received: '${err.value}'.`
                : " Field is required.";
            messages.push(`'${path}':${received} Allowed values: ${allowed}.`);
          } else if ("isUuid" in (err.constraints || {})) {
            // UUIDs are never sensitive — echo the received value to make malformed ids diagnosable
            messages.push(`${err.constraints!.isUuid} (received: ${JSON.stringify(err.value)})`);
          } else {
            const constraints = Object.values(err.constraints || {});
            messages.push(constraints[0] ?? `'${path}' is invalid`);
          }
        }
      }
      return messages;
    };

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        exceptionFactory: (errors: ValidationError[]) => {
          return new BadRequestException(flattenValidationErrors(errors));
        },
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    // NestJS runs global filters in reverse registration order (last = first to run).
    // AllExceptionsFilter must be first (runs last) so specific filters take priority.
    app.useGlobalFilters(
      new AllExceptionsFilter(),
      new ValidationExceptionFilter(),
      new PrismaExceptionFilter(),
    );

    const config = new DocumentBuilder()
      .setTitle(`Enterprise Resource Planning (ERP)`)
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);

    const port = process.env.PORT || 5000;
    await app.listen(port, "0.0.0.0");

    logger.log(`🚀 ONLINE: Application is running on port: ${port}`);
    logger.log(`✅ READY: Health check endpoint /api/health is live`);
  } catch (error) {
    console.error("❌ FATAL STARTUP ERROR:");
    console.error(error);
    process.exit(1);
  }
}

bootstrap();
