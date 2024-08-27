import { AppError } from '../app.error';

export class InvalidDataError extends AppError {
  constructor(
    public message: string = 'Invalid Data',
    public status: number = 400,
    public data?: any,
    public error: boolean = true,
  ) {
    super(message, status, data, error);
  }
}
