import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { AppError } from './internal/lib/error/app.error';

@Catch()
export class ExceptionFilter extends BaseExceptionFilter {
  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const error_response =
      exception instanceof AppError
        ? response.status(exception.status).json(exception.toStruct())
        : response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            name: exception.name,
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: exception.message,
            error: true,
          });

    Logger.error('Exception: ', exception);
    Logger.error('Response: ', error_response);

    super.catch(exception, host);
  }
}
