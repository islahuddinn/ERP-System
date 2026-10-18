import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { Response } from "express";

/**
 * Global exception filter for Prisma errors
 * Converts Prisma errors into appropriate HTTP responses
 * Prevents 500 errors from leaking database implementation details
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let error = "Internal Server Error";

    // Log the full error for debugging
    this.logger.error(
      `Prisma error on ${request.method} ${request.url}: ${exception.message}`,
      JSON.stringify(
        {
          errorCode: exception.code,
          errorMessage: exception.message,
          errorMeta: exception.meta,
          errorStack: exception.stack,
          requestBody: request.body,
          requestUser: (request as any).user?.id,
          requestTenant: (request as any).user?.tenantId,
        },
        null,
        2,
      ),
    );

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma errors
      switch (exception.code) {
        case "P2000":
          status = HttpStatus.BAD_REQUEST;
          message = "The provided value is too long for the column";
          error = "Bad Request";
          break;

        case "P2001":
          status = HttpStatus.NOT_FOUND;
          message = "Record not found";
          error = "Not Found";
          break;

        case "P2002":
          status = HttpStatus.CONFLICT;
          const target = exception.meta?.target as string[] | undefined;
          const field = target?.[0] || "field";
          message = `A record with this ${field} already exists`;
          error = "Conflict";
          break;

        case "P2003": {
          status = HttpStatus.BAD_REQUEST;
          error = "Bad Request";
          // Extract constraint name from meta or directly from the exception message.
          // Prisma message: "Foreign key constraint violated on the constraint: `sites_location_id_fkey`"
          const rawConstraint = (exception.meta?.field_name ??
            exception.meta?.constraint ??
            exception.message?.match(/`([^`]+_fkey)`/)?.[1] ??
            "") as string;
          // Parse "sites_location_id_fkey" → "locationId"
          //   1. strip _fkey suffix
          //   2. drop the table name (first segment before first underscore)
          //   3. snake_case → camelCase
          const fkField = rawConstraint
            ? rawConstraint
                .replace(/_fkey$/i, "")
                .replace(/^[^_]+_/, "")
                .replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
            : "";
          const sentValue = fkField ? (request.body?.[fkField] as string | undefined) : undefined;
          message = fkField
            ? sentValue
              ? `Invalid '${fkField}': '${sentValue}' does not exist`
              : `Invalid '${fkField}': the provided ID does not exist`
            : "One of the provided IDs references a record that does not exist";
          break;
        }

        case "P2004":
          status = HttpStatus.BAD_REQUEST;
          message = "A constraint failed on the database";
          error = "Bad Request";
          break;

        case "P2005":
          status = HttpStatus.BAD_REQUEST;
          message = "Invalid value provided for field";
          error = "Bad Request";
          break;

        case "P2006":
          status = HttpStatus.BAD_REQUEST;
          message = "The provided value is not valid";
          error = "Bad Request";
          break;

        case "P2007":
          status = HttpStatus.BAD_REQUEST;
          message = "Data validation error";
          error = "Bad Request";
          break;

        case "P2008":
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = "Failed to parse the query";
          error = "Internal Server Error";
          break;

        case "P2009":
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = "Failed to validate the query";
          error = "Internal Server Error";
          break;

        case "P2010":
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = "Raw query failed";
          error = "Internal Server Error";
          break;

        case "P2011": {
          const nullField =
            exception.meta?.constraint ?? exception.meta?.field_name ?? "unknown field";
          status = HttpStatus.BAD_REQUEST;
          message = `"${nullField}" is required and cannot be null`;
          error = "Bad Request";
          break;
        }

        case "P2012":
          status = HttpStatus.BAD_REQUEST;
          message = "Missing required value";
          error = "Bad Request";
          break;

        case "P2013":
          status = HttpStatus.BAD_REQUEST;
          message = "Missing required argument";
          error = "Bad Request";
          break;

        case "P2014":
          status = HttpStatus.BAD_REQUEST;
          message = "The change would violate a required relation";
          error = "Bad Request";
          break;

        case "P2015":
          status = HttpStatus.NOT_FOUND;
          message = "Related record not found";
          error = "Not Found";
          break;

        case "P2016":
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = "Query interpretation error";
          error = "Internal Server Error";
          break;

        case "P2017":
          status = HttpStatus.BAD_REQUEST;
          message = "The records for relation are not connected";
          error = "Bad Request";
          break;

        case "P2018":
          status = HttpStatus.BAD_REQUEST;
          message = "Required connected records not found";
          error = "Bad Request";
          break;

        case "P2019":
          status = HttpStatus.BAD_REQUEST;
          message = "Input error";
          error = "Bad Request";
          break;

        case "P2020":
          status = HttpStatus.BAD_REQUEST;
          message = "Value out of range for the type";
          error = "Bad Request";
          break;

        case "P2021":
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = "The table does not exist in the current database";
          error = "Internal Server Error";
          break;

        case "P2022":
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = "The column does not exist in the current database";
          error = "Internal Server Error";
          this.logger.error(
            `CRITICAL: Database schema mismatch detected. Column not found: ${exception.meta?.column}`,
          );
          break;

        case "P2023":
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = "Inconsistent column data";
          error = "Internal Server Error";
          break;

        case "P2024":
          status = HttpStatus.SERVICE_UNAVAILABLE;
          message = "Timed out fetching a new connection from the pool";
          error = "Service Unavailable";
          break;

        case "P2025":
          status = HttpStatus.NOT_FOUND;
          message = "Record to update or delete not found";
          error = "Not Found";
          break;

        case "P2026":
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = "The current database provider does not support a feature";
          error = "Internal Server Error";
          break;

        case "P2027":
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = "Multiple errors occurred on the database during query execution";
          error = "Internal Server Error";
          break;

        case "P2028":
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = "Transaction API error";
          error = "Internal Server Error";
          break;

        case "P2030":
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = "Cannot find a fulltext index to use for the search";
          error = "Internal Server Error";
          break;

        case "P2033":
          status = HttpStatus.BAD_REQUEST;
          message = "A number used in the query does not fit into a 64 bit signed integer";
          error = "Bad Request";
          break;

        case "P2034":
          status = HttpStatus.CONFLICT;
          message = "Transaction failed due to a write conflict or a deadlock";
          error = "Conflict";
          break;

        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = "A database error occurred";
          error = "Internal Server Error";
          this.logger.error(`Unhandled Prisma error code: ${exception.code}`);
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = "Invalid data provided";
      error = "Bad Request";
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = "Database connection failed";
      error = "Service Unavailable";
      this.logger.error("CRITICAL: Database initialization error", exception.stack);
    } else if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "An unknown database error occurred";
      error = "Internal Server Error";
    }

    // Send response
    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
