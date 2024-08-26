import { Controller, Post, Body, Inject } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { IAuthUserDTO } from 'src/domain/DTO/user/auth.dto';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { IAuthService } from 'src/domain/service/user/auth.service';

@Controller('user')
export class UsersController {
  constructor(
    @Inject(MODULE.USER.SERVICE.AUTH)
    private readonly service: IAuthService,
  ) {}

  @Post('signup')
  signup(@Body() user: ISignupUserDTO) {
    return this.service.signup(user);
  }

  @Post('login')
  login(@Body() user: IAuthUserDTO) {
    return this.service.login(user);
  }
}
