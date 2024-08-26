import { Injectable } from '@nestjs/common';
import { IAuthUserDTO } from 'src/domain/DTO/user/auth.dto';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { IUserShouldNotAlreadyExistsToSignupPolicy } from 'src/domain/policy/user/alredy_exists.policy';
import { IAuthService } from 'src/domain/service/user/auth.service';
import { IHashPasswordUseCase } from 'src/domain/use_case/user/security/hash_password.use_case';
import { ISignupUserUseCase } from 'src/domain/use_case/user/signup.use_case';
import { UserAlredyExistsError } from 'src/internal/lib/error/user/alredy_exists.error';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly hashPassword: IHashPasswordUseCase,
    private readonly userShouldNotAlreadyExistsToSignup: IUserShouldNotAlreadyExistsToSignupPolicy,
    private readonly signupUser: ISignupUserUseCase,
  ) {}

  async login(user: IAuthUserDTO) {
    throw new Error('Method not implemented.');
  }
  async signup(user: ISignupUserDTO) {
    if (await this.userShouldNotAlreadyExistsToSignup.execute(user))
      throw new UserAlredyExistsError();

    user.password = await this.hashPassword.execute(user);
    return await this.signupUser.execute(user);
  }
}
