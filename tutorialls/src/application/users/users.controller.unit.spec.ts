import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { MODULE } from 'src/app.registry';
import { IUserService } from 'src/domain/service/user/user.service';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { ILoginUserDTO } from 'src/domain/DTO/user/login.dto';

describe('UsersController (Unit)', () => {
  let usersController: UsersController;
  let userServiceMock: jest.Mocked<IUserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: MODULE.USER.SERVICE.AUTH,
          useValue: {
            signup: jest.fn(),
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    usersController = module.get<UsersController>(UsersController);
    userServiceMock = module.get(MODULE.USER.SERVICE.AUTH);
  });

  it('should be defined', () => {
    expect(usersController).toBeDefined();
  });

  describe('signup', () => {
    it('should call UserService.signup with the correct user data', async () => {
      const userMock: ISignupUserDTO = {
        email: 'test@test.com',
        password: '12345',
      };

      await usersController.signup(userMock);

      expect(userServiceMock.signup).toHaveBeenCalledWith(userMock);
    });

    it('should return undefined after successful signup', async () => {
      const userMock: ISignupUserDTO = {
        email: 'test@test.com',
        password: '12345',
      };

      userServiceMock.signup.mockResolvedValueOnce(undefined);

      const result = await usersController.signup(userMock);

      expect(result).toBeUndefined();
    });
  });

  describe('login', () => {
    it('should call UserService.login with the correct user data', async () => {
      const userMock: ILoginUserDTO = {
        email: 'test@test.com',
        password: '12345',
      };

      userServiceMock.login.mockResolvedValueOnce({
        token: 'authToken',
      });

      await usersController.login(userMock);

      expect(userServiceMock.login).toHaveBeenCalledWith(userMock);
    });

    it('should return a token after successful login', async () => {
      const userMock: ILoginUserDTO = {
        email: 'test@test.com',
        password: '12345',
      };

      userServiceMock.login.mockResolvedValueOnce({
        token: 'authToken',
      });

      const result = await usersController.login(userMock);

      expect(result).toStrictEqual({ token: 'authToken' });
    });
  });
});
