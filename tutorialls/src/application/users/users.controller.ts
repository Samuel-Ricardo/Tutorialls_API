import { Controller, Post, Body, Inject } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { ILoginUserDTO } from 'src/domain/DTO/user/login.dto';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { IUserService } from 'src/domain/service/user/user.service';
import { ZodValidationPipe } from './pipe/validation/zod/zod.pipe';
import { SignupSchema } from './validation/zod/user/signup.schema';
import { LoginSchema } from './validation/zod/user/login.schema';
import { DecryptUserPipe } from './pipe/encryption/encryption.pipe';

@Controller('user')
export class UsersController {
  constructor(
    @Inject(MODULE.USER.SERVICE.AUTH)
    private readonly service: IUserService,
  ) {}

  @Post('signup')
  async signup(
    @Body(DecryptUserPipe, new ZodValidationPipe(SignupSchema))
    user: ISignupUserDTO,
  ) {
    await this.service.signup(user);
  }

  @Post('login')
  async login(
    @Body(DecryptUserPipe, new ZodValidationPipe(LoginSchema))
    user: ILoginUserDTO,
  ) {
    return await this.service.login(user);
  }
}
