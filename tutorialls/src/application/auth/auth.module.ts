import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { MODULE } from 'src/app.registry';
import { JwtGenerateAuthTokenUseCase } from './use_case/generate_token.use_case';
import { JwtValidateAuthTokenUseCase } from './use_case/validate_token.use_case';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({ secret: 'secret', signOptions: { expiresIn: '1d' } }),
  ],
  providers: [
    AuthService,
    {
      provide: MODULE.AUHT.USE_CASE.TOKEN.GENERATE,
      useValue: JwtGenerateAuthTokenUseCase,
    },
    {
      provide: MODULE.AUHT.USE_CASE.TOKEN.VALIDATE,
      useValue: JwtValidateAuthTokenUseCase,
    },
  ],
})
export class AuthModule {}
