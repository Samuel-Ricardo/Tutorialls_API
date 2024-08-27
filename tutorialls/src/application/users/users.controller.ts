import { Controller, Post, Body, Inject } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { ILoginUserDTO } from 'src/domain/DTO/user/login.dto';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { IUserService } from 'src/domain/service/user/user.service';

@Controller('user')
export class UsersController {
  constructor(
    @Inject(MODULE.USER.SERVICE.AUTH)
    private readonly service: IUserService,
  ) {}

  @Post('signup')
  async signup(@Body() user: ISignupUserDTO) {
    await this.service.signup(user);
  }

  @Post('login')
  async login(@Body() user: ILoginUserDTO) {
    return { token: (await this.service.login(user)).toDTO().authToken };
  }
}
