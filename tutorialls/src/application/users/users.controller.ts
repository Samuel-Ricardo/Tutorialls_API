import { Controller, Post, Body } from '@nestjs/common';
import { IAuthUserDTO } from 'src/domain/DTO/user/auth.dto';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { IAuthService } from 'src/domain/service/user/auth.service';

@Controller('user')
export class UsersController {
  constructor(private readonly service: IAuthService) {}

  @Post('signup')
  signup(@Body() user: ISignupUserDTO) {
    return this.service.signup(user);
  }

  @Post('login')
  login(@Body() user: IAuthUserDTO) {
    return this.service.login(user);
  }
}
