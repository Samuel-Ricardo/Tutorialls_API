import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { MODULE } from 'src/app.registry';
import { IUserService } from 'src/domain/service/user/user.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(MODULE.USER.SERVICE)
    private readonly service: IUserService,
  ) {
    super();
  }

  async validate(email: string, password: string) {
    return await this.service.login({ email, password });
  }
}
