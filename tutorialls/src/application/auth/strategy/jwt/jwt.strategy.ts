import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IJwtPayloadDTO } from 'src/domain/DTO/auth/jwt/payload.dto';
import { EnvService } from 'src/infra/config/env/env.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly env: EnvService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.getJwtSecret(),
    });
  }

  async validate(payload: any | IJwtPayloadDTO) {
    return { userId: payload.sub, username: payload.username };
  }
}
