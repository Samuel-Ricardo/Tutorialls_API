import { Injectable } from '@nestjs/common';
import { createDecipheriv } from 'crypto';
import { IDecryptUserDTO } from 'src/domain/DTO/security/user/decrypt.dto';
import { IDecryptUserUseCase } from 'src/domain/use_case/user/security/decrypt.use_case';

@Injectable()
export class NodeDecryptUserUseCase implements IDecryptUserUseCase {
  private readonly algorithm = 'aes-256-ctr';
  private readonly secretKey = 'secret';

  async execute({ ciphertext }: IDecryptUserDTO) {
    const [iv, encryptedText] = ciphertext.split(':');
    const decipher = createDecipheriv(
      this.algorithm,
      this.secretKey,
      Buffer.from(iv, 'hex'),
    );
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedText, 'hex')),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString());
  }
}
