import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { ILoginUserDTO } from 'src/domain/DTO/user/login.dto';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { IUserShouldExistsToAuthPolicy } from 'src/domain/policy/user/login_alredy_exists.policy';
import { IPasswordShouldBeValidToLoginPolicy } from 'src/domain/policy/user/password_is_valid.policy';
import { IUserShouldNotAlreadyExistsToSignupPolicy } from 'src/domain/policy/user/signup_alredy_exists.policy';
import { IAuthService } from 'src/domain/service/auth/auth.service';
import { IUserService } from 'src/domain/service/user/user.service';
import { IHashPasswordUseCase } from 'src/domain/use_case/user/security/hash_password.use_case';
import { ISignupUserUseCase } from 'src/domain/use_case/user/signup.use_case';
import { UserAlredyExistsError } from 'src/internal/lib/error/user/alredy_exists.error';
import { InvalidCredentials } from 'src/internal/lib/error/user/invalid_password.error';
import { UserNotFoundError } from 'src/internal/lib/error/user/not_found.error';

@Injectable()
export class UserService implements IUserService {
  constructor(
    @Inject(MODULE.USER.POLICY.ALREDY_EXISTS)
    private readonly userShouldNotAlreadyExistsToSignup: IUserShouldNotAlreadyExistsToSignupPolicy,
    @Inject(MODULE.USER.POLICY.SHOULD_EXISTS)
    private readonly userShouldExistsToAuth: IUserShouldExistsToAuthPolicy,
    @Inject(MODULE.USER.POLICY.IS_VALID_PASSWORD)
    private readonly passwordIsValid: IPasswordShouldBeValidToLoginPolicy,
    @Inject(MODULE.USER.USE_CASE.HASH.PASSWORD)
    private readonly hashPassword: IHashPasswordUseCase,
    @Inject(MODULE.USER.USE_CASE.SIGNUP)
    private readonly signupUser: ISignupUserUseCase,
    @Inject(MODULE.AUTH.SERVICE.JWT)
    private readonly authService: IAuthService,
  ) {}

  async login(user: ILoginUserDTO) {
    const result = (await this.userShouldExistsToAuth.execute(user))?.toDTO();
    if (!result) throw new UserNotFoundError();

    if (
      !(await this.passwordIsValid.execute({
        login_password: user.password,
        registered_password: result.password,
      }))
    )
      throw new InvalidCredentials();

    const token = await this.authService.authenticate({
      id: result.id!,
      email: result.email,
      password: user.password,
    });

    return { token };
  }

  async signup(user: ISignupUserDTO) {
    if (await this.userShouldNotAlreadyExistsToSignup.execute(user))
      throw new UserAlredyExistsError();

    user.password = await this.hashPassword.execute(user);
    await this.signupUser.execute(user);
  }
}
