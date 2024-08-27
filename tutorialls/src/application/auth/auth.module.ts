import { Module } from '@nestjs/common';
import { JwtAuthService } from './auth.service';
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
    {
      provide: MODULE.AUTH.SERVICE.JWT,
      useValue: JwtAuthService,
    },
    {
      provide: MODULE.AUTH.USE_CASE.TOKEN.GENERATE,
      useValue: JwtGenerateAuthTokenUseCase,
    },
    {
      provide: MODULE.AUTH.USE_CASE.TOKEN.VALIDATE,
      useValue: JwtValidateAuthTokenUseCase,
    },
  ],
  exports: [
    {
      provide: MODULE.AUTH.SERVICE.JWT,
      useValue: JwtAuthService,
    },
  ],
})
export class AuthModule {}
