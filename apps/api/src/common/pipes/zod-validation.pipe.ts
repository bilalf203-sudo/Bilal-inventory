import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

/**
 * Zod-based validation pipe. Wraps any Zod schema as a NestJS validation pipe.
 *
 * @example
 *   @Post()
 *   create(@Body(new ZodValidationPipe(createXSchema)) dto: CreateXInput) { ... }
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    try {
      return this.schema.parse(value);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'ValidationError',
          message: 'Invalid request payload',
          issues: err.errors.map((e) => ({
            path: e.path.join('.'),
            code: e.code,
            message: e.message,
          })),
        });
      }
      throw err;
    }
  }
}
