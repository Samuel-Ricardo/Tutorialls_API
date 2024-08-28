import { Module } from '@nestjs/common';
import { JwtAuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { MODULE } from 'src/app.registry';
import { JwtGenerateAuthTokenUseCase } from './use_case/generate_token.use_case';
import { JwtValidateAuthTokenUseCase } from './use_case/validate_token.use_case';
import { ConfigModule } from 'src/infra/config/config.module';
import { EnvService } from 'src/infra/config/env/env.service';

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    JwtModule.register({
      secret: EnvService.ENV.JWT.SECRET,
      signOptions: { expiresIn: EnvService.ENV.JWT.EXPIRES_IN },
    }),
  ],
  providers: [
    {
      provide: MODULE.AUTH.SERVICE.JWT,
      useClass: JwtAuthService,
    },
    {
      provide: MODULE.AUTH.USE_CASE.TOKEN.GENERATE,
      useClass: JwtGenerateAuthTokenUseCase,
    },
    {
      provide: MODULE.AUTH.USE_CASE.TOKEN.VALIDATE,
      useClass: JwtValidateAuthTokenUseCase,
    },
  ],
  exports: [
    {
      provide: MODULE.AUTH.SERVICE.JWT,
      useClass: JwtAuthService,
    },
  ],
})
export class AuthModule {}
