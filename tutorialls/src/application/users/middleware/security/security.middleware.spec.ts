import { Test, TestingModule } from '@nestjs/testing';
import { SecurityMiddleware } from './security.middleware';
import { MODULE } from 'src/app.registry';
import { IEncryptionService } from 'src/domain/service/security/encryption.service';
import { NextFunction, Request, Response } from 'express';

describe('SecurityMiddleware', () => {
  let middleware: SecurityMiddleware;
  let mockEncryptionService: IEncryptionService;

  beforeEach(async () => {
    mockEncryptionService = {
      encryptUser: jest.fn().mockReturnValue('encrypted-user-data'),
    } as unknown as IEncryptionService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityMiddleware,
        {
          provide: MODULE.ENCRYPTION.SERVICE.NODE,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    middleware = module.get<SecurityMiddleware>(SecurityMiddleware);
  });

  it('should be defined', async () => {
    expect(middleware).toBeDefined();
  });

  it('should encrypt the user data and call next with the encrypted data', async () => {
    const req = {
      body: { username: 'testuser', password: 'testpassword' },
    } as Request;
    const res = {} as Response;
    const next: NextFunction = jest.fn();

    await middleware.use(req, res, next);

    expect(mockEncryptionService.encryptUser).toHaveBeenCalledWith(req.body);
    expect(next).toHaveBeenCalledWith('encrypted-user-data');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
