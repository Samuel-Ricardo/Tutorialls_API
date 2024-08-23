import { IError } from 'src/@types/internal/lib/error.type';
import { IErrorDTO } from 'src/domain/DTO/error/app.dto';

export class AppError extends Error implements IError {
  constructor(
    public message: string,
    public status: number = 500,
    public data?: any,
    public error: boolean = true,
    public url?: string,
  ) {
    super(message);
    this.url = url ?? `https://http.cat/status/${status}`;
  }

  toStruct(): IErrorDTO {
    return {
      message: this.message,
      status: this.status,
      data: this.data,
      error: this.error,
    };
  }

  static fromStruct(error: IError | IErrorDTO): AppError {
    return new AppError(
      error.message,
      error.status,
      error.data,
      error.error,
      error.url,
    );
  }
}
