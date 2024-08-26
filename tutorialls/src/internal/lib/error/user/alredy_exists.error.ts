import { AppError } from '../app.error';

export class UserAlredyExistsError extends AppError {
  constructor(
    public message: string = 'User Alredy Exists',
    public status: number = 409,
    public data?: any,
    public error: boolean = true,
  ) {
    super(message, status, data, error);
  }
}
