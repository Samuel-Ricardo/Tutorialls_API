import { Inject, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { MODULE } from 'src/app.registry';
import { IDecryptUserDTO } from 'src/domain/DTO/security/user/decrypt.dto';
import { IEncryptUserDTO } from 'src/domain/DTO/security/user/encrypt.dto';
import { IEncryptionService } from 'src/domain/service/security/encryption.service';
import { IDecryptUserUseCase } from 'src/domain/use_case/user/security/decrypt.use_case';
import { IEncryptUserUseCase } from 'src/domain/use_case/user/security/encrypt.use_case';

@Injectable()
export class NodeEncryptionService implements IEncryptionService {
  constructor(
    @Inject(MODULE.ENCRYPTION.USE_CASE.USER.ENCRYPT)
    private readonly encryptUserUseCase: IEncryptUserUseCase,
    @Inject(MODULE.ENCRYPTION.USE_CASE.USER.DECRYPT)
    private readonly decryptUserUseCase: IDecryptUserUseCase,
  ) {}

  async encryptUser(DTO: IEncryptUserDTO) {
    return await this.encryptUserUseCase.execute(DTO);
  }
  async decryptUser(DTO: IDecryptUserDTO) {
    return await this.decryptUserUseCase.execute(DTO);
  }
}
