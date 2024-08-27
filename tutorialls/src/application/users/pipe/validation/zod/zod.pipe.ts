import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { InvalidDataError } from 'src/internal/lib/error/data/invalid.error';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: any, metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    throw new InvalidDataError(result.error.message);
  }
}
