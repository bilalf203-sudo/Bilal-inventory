import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/**
 * Global exception filter that produces consistent error envelopes
 * and maps Prisma errors to appropriate HTTP responses.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = {
      statusCode: status,
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      body =
        typeof res === 'object' && res !== null
          ? { statusCode: status, ...(res as object) }
          : { statusCode: status, error: exception.name, message: res };
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = mapPrismaError(exception);
      status = mapped.status;
      body = { statusCode: status, error: mapped.error, message: mapped.message };
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error on ${request.method} ${request.url}: ${exception.message}`, exception.stack);
    }

    response.status(status).json({
      ...body,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

function mapPrismaError(err: Prisma.PrismaClientKnownRequestError) {
  switch (err.code) {
    case 'P2002':
      return {
        status: HttpStatus.CONFLICT,
        error: 'ConflictError',
        message: `Unique constraint failed on field(s): ${(err.meta?.target as string[])?.join(', ')}`,
      };
    case 'P2025':
      return {
        status: HttpStatus.NOT_FOUND,
        error: 'NotFoundError',
        message: 'Record not found',
      };
    case 'P2003':
      return {
        status: HttpStatus.BAD_REQUEST,
        error: 'ForeignKeyError',
        message: 'Foreign key constraint failed',
      };
    default:
      return {
        status: HttpStatus.BAD_REQUEST,
        error: 'DatabaseError',
        message: err.message,
      };
  }
}
