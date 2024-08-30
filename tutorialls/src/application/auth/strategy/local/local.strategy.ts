import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { MODULE } from 'src/app.registry';
import { IAuthService } from 'src/domain/service/auth/auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(MODULE.AUTH.SERVICE.JWT)
    private readonly service: IAuthService,
  ) {
    super();
  }

  async validate(email: string, password: string) {
    return this.service.authenticate({ email, password });
  }
}
