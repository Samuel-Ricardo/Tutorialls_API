import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IGenerateAuthTokenDTO } from 'src/domain/DTO/auth/token/generate.dto';
import { IGenerateAuthTokenUseCase } from 'src/domain/use_case/auth/generate_token.use_case';

@Injectable()
export class JwtGenerateAuthTokenUseCase implements IGenerateAuthTokenUseCase {
  constructor(private readonly jwt: JwtService) {}

  async execute(user: IGenerateAuthTokenDTO) {
    return await this.jwt.signAsync(user);
  }
}
