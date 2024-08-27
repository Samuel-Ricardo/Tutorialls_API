import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { MODULE } from 'src/app.registry';
import { IAuthService } from 'src/domain/service/user/auth.service';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { IAuthUserDTO } from 'src/domain/DTO/user/auth.dto';
import { User } from 'src/domain/entity/user.entity';

describe('UsersController', () => {
  let usersController: UsersController;
  let authServiceMock: jest.Mocked<IAuthService>;

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
    authServiceMock = module.get(MODULE.USER.SERVICE.AUTH);
  });

  it('should be defined', async () => {
    expect(usersController).toBeDefined();
  });

  describe('signup', () => {
    it('should call AuthService.signup with the correct user data', async () => {
      const userMock: ISignupUserDTO = {
        email: 'test@test.com',
        password: '12345',
      };
      const userEntityMock = User.fromDTO({
        id: '564g9edgs',
        email: 'test@test.com',
        password: '12345',
        authToken: 'authToken',
      });

      authServiceMock.signup.mockResolvedValueOnce(userEntityMock);

      const result = await usersController.signup(userMock);

      expect(authServiceMock.signup).toHaveBeenCalledWith(userMock);
      expect(result).toBe(undefined);
    });
  });

  describe('login', () => {
    it('should call AuthService.login with the correct user data', async () => {
      const userMock: IAuthUserDTO = {
        email: 'test@test.com',
        password: '12345',
      };
      const userEntityMock = User.fromDTO({
        id: '564g9edgs',
        email: 'test@test.com',
        password: '12345',
        authToken: 'authToken',
      });

      authServiceMock.login.mockResolvedValueOnce(userEntityMock);

      const result = await usersController.login(userMock);

      expect(authServiceMock.login).toHaveBeenCalledWith(userMock);
      expect(result).toStrictEqual({ token: 'authToken' });
    });
  });
});
