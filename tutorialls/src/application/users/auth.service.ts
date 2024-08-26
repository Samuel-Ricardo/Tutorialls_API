import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { IAuthUserDTO } from 'src/domain/DTO/user/auth.dto';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { IUserDTO } from 'src/domain/DTO/user/user.dto';
import { User } from 'src/domain/entity/user.entity';
import { IUserShouldNotAlreadyExistsToSignupPolicy } from 'src/domain/policy/user/alredy_exists.policy';
import { IAuthService } from 'src/domain/service/user/auth.service';
import { IHashPasswordUseCase } from 'src/domain/use_case/user/security/hash_password.use_case';
import { ISignupUserUseCase } from 'src/domain/use_case/user/signup.use_case';
import { UserAlredyExistsError } from 'src/internal/lib/error/user/alredy_exists.error';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(MODULE.USER.USE_CASE.HASH.PASSWORD)
    private readonly hashPassword: IHashPasswordUseCase,
    @Inject(MODULE.USER.POLICY.ALREDY_EXISTS)
    private readonly userShouldNotAlreadyExistsToSignup: IUserShouldNotAlreadyExistsToSignupPolicy,
    @Inject(MODULE.USER.USE_CASE.SIGNUP)
    private readonly signupUser: ISignupUserUseCase,
  ) {}

  async login(user: IAuthUserDTO) {
    console.log({ user });
    return User.fromDTO({} as IUserDTO);
  }

  async signup(user: ISignupUserDTO) {
    if (await this.userShouldNotAlreadyExistsToSignup.execute(user))
      throw new UserAlredyExistsError();

    user.password = await this.hashPassword.execute(user);
    return await this.signupUser.execute(user);
  }
}
