import { IDecryptUserDTO } from 'src/domain/DTO/security/user/decrypt.dto';
import { IEncryptUserDTO } from 'src/domain/DTO/security/user/encrypt.dto';
import { IUserDTO } from 'src/domain/DTO/user/user.dto';

export interface IEncryptionService {
  encryptUser(DTO: IEncryptUserDTO): Promise<string>;
  decryptUser(DTO: IDecryptUserDTO): Promise<IUserDTO>;
}
