import { z } from 'zod';
import { ZodValidationPipe } from './zod.pipe';

describe('ZodPipe', () => {
  it('should be defined', () => {
    expect(new ZodValidationPipe(z.object({})));
  });
});
