import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { IGenerateAuthTokenDTO } from 'src/domain/DTO/auth/token/generate.dto';
import { IValidateAuthTokenDTO } from 'src/domain/DTO/auth/token/validate.dto';
import { IAuthService } from 'src/domain/service/auth/auth.service';
import { IGenerateAuthTokenUseCase } from 'src/domain/use_case/auth/generate_token.use_case';
import { IValidateAuthTokenUseCase } from 'src/domain/use_case/auth/validate_token.use_case';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(MODULE.AUHT.USE_CASE.TOKEN.GENERATE)
    private readonly generateToken: IGenerateAuthTokenUseCase,
    @Inject(MODULE.AUHT.USE_CASE.TOKEN.VALIDATE)
    private readonly validateToken: IValidateAuthTokenUseCase,
  ) {}

  async authenticate(user: IGenerateAuthTokenDTO): Promise<string> {
    return await this.generateToken.execute(user);
  }

  async validate(user: IValidateAuthTokenDTO): Promise<boolean> {
    return await this.validateToken.execute(user);
  }
}
