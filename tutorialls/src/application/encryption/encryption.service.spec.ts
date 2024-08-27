import { Test, TestingModule } from '@nestjs/testing';
import { NodeEncryptionService } from './encryption.service';
import { MODULE } from 'src/app.registry';
import { IEncryptUserUseCase } from 'src/domain/use_case/user/security/encrypt.use_case';
import { IDecryptUserUseCase } from 'src/domain/use_case/user/security/decrypt.use_case';
import { IEncryptUserDTO } from 'src/domain/DTO/security/user/encrypt.dto';
import { IDecryptUserDTO } from 'src/domain/DTO/security/user/decrypt.dto';

describe('NodeEncryptionService', () => {
  let service: NodeEncryptionService;
  let mockEncryptUserUseCase: IEncryptUserUseCase;
  let mockDecryptUserUseCase: IDecryptUserUseCase;

  beforeEach(async () => {
    mockEncryptUserUseCase = {
      execute: jest.fn().mockResolvedValue('encrypted-user-data'),
    } as unknown as IEncryptUserUseCase;

    mockDecryptUserUseCase = {
      execute: jest.fn().mockResolvedValue('decrypted-user-data'),
    } as unknown as IDecryptUserUseCase;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodeEncryptionService,
        {
          provide: MODULE.ENCRYPTION.USE_CASE.USER.ENCRYPT,
          useValue: mockEncryptUserUseCase,
        },
        {
          provide: MODULE.ENCRYPTION.USE_CASE.USER.DECRYPT,
          useValue: mockDecryptUserUseCase,
        },
      ],
    }).compile();

    service = module.get<NodeEncryptionService>(NodeEncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should encrypt user data', async () => {
    const encryptDTO: IEncryptUserDTO = {
      user: { email: 'test-email', password: 'test-password' },
    };

    const result = await service.encryptUser(encryptDTO);

    expect(mockEncryptUserUseCase.execute).toHaveBeenCalledWith(encryptDTO);
    expect(result).toBe('encrypted-user-data');
  });

  it('should decrypt user data', async () => {
    const decryptDTO: IDecryptUserDTO = { ciphertext: 'encrypted-data' };

    const result = await service.decryptUser(decryptDTO);

    expect(mockDecryptUserUseCase.execute).toHaveBeenCalledWith(decryptDTO);
    expect(result).toBe('decrypted-user-data');
  });
});
