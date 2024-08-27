import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IValidateAuthTokenDTO } from 'src/domain/DTO/auth/token/validate.dto';
import { IValidateAuthTokenUseCase } from 'src/domain/use_case/auth/validate_token.use_case';

@Injectable()
export class JwtValidateAuthTokenUseCase implements IValidateAuthTokenUseCase {
  constructor(private readonly jwt: JwtService) {}

  async execute<T>({ token }: IValidateAuthTokenDTO) {
    return (await this.jwt.verifyAsync(token)) as T;
  }
}
