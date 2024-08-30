import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { MODULE } from 'src/app.registry';
import { IUserShouldExistsToAuthPolicy } from 'src/domain/policy/user/login_alredy_exists.policy';
import { IPasswordShouldBeValidToLoginPolicy } from 'src/domain/policy/user/password_is_valid.policy';
import { IUserShouldNotAlreadyExistsToSignupPolicy } from 'src/domain/policy/user/signup_alredy_exists.policy';
import { IAuthService } from 'src/domain/service/auth/auth.service';
import { ISignupUserUseCase } from 'src/domain/use_case/user/signup.use_case';
import { IHashPasswordUseCase } from 'src/domain/use_case/user/security/hash_password.use_case';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { ILoginUserDTO } from 'src/domain/DTO/user/login.dto';
import { UserAlredyExistsError } from 'src/internal/lib/error/user/alredy_exists.error';
import { InvalidCredentials } from 'src/internal/lib/error/user/invalid_password.error';
import { UserNotFoundError } from 'src/internal/lib/error/user/not_found.error';
import { User } from 'src/domain/entity/user.entity';
import { IGenerateAuthTokenDTO } from 'src/domain/DTO/auth/token/generate.dto';

describe('UserService', () => {
  let userService: UserService;
  let userShouldNotAlreadyExistsToSignupMock: jest.Mocked<IUserShouldNotAlreadyExistsToSignupPolicy>;
  let userShouldExistsToAuthMock: jest.Mocked<IUserShouldExistsToAuthPolicy>;
  let passwordIsValidMock: jest.Mocked<IPasswordShouldBeValidToLoginPolicy>;
  let hashPasswordMock: jest.Mocked<IHashPasswordUseCase>;
  let signupUserMock: jest.Mocked<ISignupUserUseCase>;
  let authServiceMock: jest.Mocked<IAuthService>;

  beforeEach(async () => {
    userShouldNotAlreadyExistsToSignupMock = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<IUserShouldNotAlreadyExistsToSignupPolicy>;
    userShouldExistsToAuthMock = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<IUserShouldExistsToAuthPolicy>;
    passwordIsValidMock = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<IPasswordShouldBeValidToLoginPolicy>;
    hashPasswordMock = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<IHashPasswordUseCase>;
    signupUserMock = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ISignupUserUseCase>;
    authServiceMock = {
      authenticate: jest.fn(),
    } as unknown as jest.Mocked<IAuthService>;

    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        {
          provide: MODULE.USER.SERVICE.AUTH,
          useClass: UserService,
        },
        {
          provide: MODULE.USER.POLICY.ALREDY_EXISTS,
          useValue: userShouldNotAlreadyExistsToSignupMock,
        },
        {
          provide: MODULE.USER.POLICY.SHOULD_EXISTS,
          useValue: userShouldExistsToAuthMock,
        },
        {
          provide: MODULE.USER.POLICY.IS_VALID_PASSWORD,
          useValue: passwordIsValidMock,
        },
        {
          provide: MODULE.USER.USE_CASE.HASH.PASSWORD,
          useValue: hashPasswordMock,
        },
        {
          provide: MODULE.USER.USE_CASE.SIGNUP,
          useValue: signupUserMock,
        },
        {
          provide: MODULE.AUTH.SERVICE.JWT,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    userService = module.get<UserService>(MODULE.USER.SERVICE.AUTH);
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
  });

  describe('signup', () => {
    it('should throw UserAlredyExistsError if user already exists', async () => {
      const userMock: ISignupUserDTO = {
        email: 'test@test.com',
        password: '12345',
      };

      userShouldNotAlreadyExistsToSignupMock.execute.mockResolvedValueOnce(
        true,
      );

      await expect(userService.signup(userMock)).rejects.toThrow(
        UserAlredyExistsError,
      );
      expect(
        userShouldNotAlreadyExistsToSignupMock.execute,
      ).toHaveBeenCalledWith(userMock);
    });

    it('should hash the user password and signup user', async () => {
      const userMock: ISignupUserDTO = {
        email: 'test@test.com',
        password: '12345',
      };
      const hashedPassword = 'hashedPassword';

      userShouldNotAlreadyExistsToSignupMock.execute.mockResolvedValueOnce(
        false,
      );
      hashPasswordMock.execute.mockResolvedValueOnce(hashedPassword);

      await userService.signup(userMock);

      expect(
        userShouldNotAlreadyExistsToSignupMock.execute,
      ).toHaveBeenCalledWith(userMock);
      expect(hashPasswordMock.execute).toHaveBeenCalledWith(userMock);
      expect(signupUserMock.execute).toHaveBeenCalledWith({
        ...userMock,
        password: hashedPassword,
      });
    });
  });

  describe('login', () => {
    it('should throw UserNotFoundError if user does not exist', async () => {
      const userMock: ILoginUserDTO = {
        email: 'test@test.com',
        password: '12345',
      };

      userShouldExistsToAuthMock.execute.mockResolvedValueOnce(null);

      await expect(userService.login(userMock)).rejects.toThrow(
        UserNotFoundError,
      );
      expect(userShouldExistsToAuthMock.execute).toHaveBeenCalledWith(userMock);
    });

    it('should throw InvalidCredentials if password is invalid', async () => {
      const userMock: ILoginUserDTO = {
        email: 'test@test.com',
        password: '12345',
      };
      const userEntityMock = User.fromDTO({
        id: '1',
        email: 'test@test.com',
        password: 'hashedPassword',
      });

      userShouldExistsToAuthMock.execute.mockResolvedValueOnce(userEntityMock);
      passwordIsValidMock.execute.mockResolvedValueOnce(false);

      await expect(userService.login(userMock)).rejects.toThrow(
        InvalidCredentials,
      );
      expect(userShouldExistsToAuthMock.execute).toHaveBeenCalledWith(userMock);
      expect(passwordIsValidMock.execute).toHaveBeenCalledWith({
        login_password: userMock.password,
        registered_password: userEntityMock.toDTO().password,
      });
    });

    it('should return a token after successful login', async () => {
      const userMock: ILoginUserDTO = {
        email: 'test@test.com',
        password: '12345',
      };

      const payload: IGenerateAuthTokenDTO = {
        id: '1',
        ...userMock,
      };

      const userEntityMock = User.fromDTO({
        id: '1',
        email: 'test@test.com',
        password: 'hashedPassword',
      });
      const tokenMock = 'authToken';

      userShouldExistsToAuthMock.execute.mockResolvedValueOnce(userEntityMock);
      passwordIsValidMock.execute.mockResolvedValueOnce(true);
      authServiceMock.authenticate.mockResolvedValueOnce(tokenMock);

      const result = await userService.login(userMock);

      expect(result).toStrictEqual({ token: tokenMock });
      expect(authServiceMock.authenticate).toHaveBeenCalledWith(payload);
    });
  });
});
