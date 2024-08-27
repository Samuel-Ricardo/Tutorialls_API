import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { IDecryptUserDTO } from 'src/domain/DTO/security/user/decrypt.dto';
import { IEncryptUserDTO } from 'src/domain/DTO/security/user/encrypt.dto';
import { IEncryptionService } from 'src/domain/service/security/encryption.service';

@Injectable()
export class NodeEncryptionService implements IEncryptionService {
  encryptUser(DTO: IEncryptUserDTO): Promise<string> {
    throw new Error('Method not implemented.');
  }
  decryptUser(DTO: IDecryptUserDTO): Promise<User> {
    throw new Error('Method not implemented.');
  }
}
