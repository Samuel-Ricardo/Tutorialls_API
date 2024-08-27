import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { MODULE } from 'src/app.registry';
import { IUserShouldNotAlreadyExistsToSignupPolicy } from 'src/domain/policy/user/signup_alredy_exists.policy';
import { IHashPasswordUseCase } from 'src/domain/use_case/user/security/hash_password.use_case';
import { ISignupUserUseCase } from 'src/domain/use_case/user/signup.use_case';
import { UserAlredyExistsError } from 'src/internal/lib/error/user/alredy_exists.error';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { User } from 'src/domain/entity/user.entity';

describe('UserService', () => {
  let authService: UserService;
  let hashPasswordMock: jest.Mocked<IHashPasswordUseCase>;
  let userShouldNotAlreadyExistsToSignupMock: jest.Mocked<IUserShouldNotAlreadyExistsToSignupPolicy>;
  let signupUserMock: jest.Mocked<ISignupUserUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: MODULE.USER.USE_CASE.HASH.PASSWORD,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: MODULE.USER.POLICY.ALREDY_EXISTS,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: MODULE.USER.USE_CASE.SIGNUP,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<UserService>(UserService);
    hashPasswordMock = module.get(MODULE.USER.USE_CASE.HASH.PASSWORD);
    userShouldNotAlreadyExistsToSignupMock = module.get(
      MODULE.USER.POLICY.ALREDY_EXISTS,
    );
    signupUserMock = module.get(MODULE.USER.USE_CASE.SIGNUP);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
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

      await expect(authService.signup(userMock)).rejects.toThrow(
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
      signupUserMock.execute.mockResolvedValueOnce({} as User);

      const result = await authService.signup(userMock);

      expect(
        userShouldNotAlreadyExistsToSignupMock.execute,
      ).toHaveBeenCalledWith(userMock);
      expect(hashPasswordMock.execute).toHaveBeenCalledWith(userMock);
      expect(signupUserMock.execute).toHaveBeenCalledWith({
        ...userMock,
        password: hashedPassword,
      });
      expect(result).toEqual({});
    });
  });
});
