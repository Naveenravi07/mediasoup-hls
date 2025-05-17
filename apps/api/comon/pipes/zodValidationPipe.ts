import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    if (!this.schema) return value;
    const parsedValue = this.schema.safeParse(value);
    if (parsedValue.success) {
      return parsedValue.data;
    } else {
      const error = parsedValue.error.errors[0];
      const errMessage = error ? `${error.path.join('.')} - ${error.message}` : 'Validation failed';
      throw new BadRequestException(errMessage);
    }
  }
}
