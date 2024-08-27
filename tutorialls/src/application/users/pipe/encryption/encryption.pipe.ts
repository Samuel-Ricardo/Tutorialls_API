import {
  ArgumentMetadata,
  Inject,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { IDecryptUserDTO } from 'src/domain/DTO/security/user/decrypt.dto';
import { IEncryptionService } from 'src/domain/service/security/encryption.service';

@Injectable()
export class DecryptUserPipe implements PipeTransform {
  constructor(
    @Inject(MODULE.ENCRYPTION.SERVICE.NODE)
    private readonly encryption: IEncryptionService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transform(value: IDecryptUserDTO, metadata: ArgumentMetadata) {
    if (value.ciphertext === undefined) return value;
    return await this.encryption.decryptUser(value);
  }
}
