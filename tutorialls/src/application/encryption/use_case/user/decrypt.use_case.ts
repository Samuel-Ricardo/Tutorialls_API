import { Injectable } from '@nestjs/common';
import { createDecipheriv } from 'crypto';
import { IDecryptUserDTO } from 'src/domain/DTO/security/user/decrypt.dto';
import { IDecryptUserUseCase } from 'src/domain/use_case/user/security/decrypt.use_case';
import { EnvService } from 'src/infra/config/env/env.service';

@Injectable()
export class NodeDecryptUserUseCase implements IDecryptUserUseCase {
  private readonly algorithm: string;
  private readonly secretKey: string;

  constructor(private readonly env: EnvService) {
    this.secretKey = this.env.getEncryptKey();
    this.algorithm = this.env.getEncryptAlgorithm();
  }

  async execute({ ciphertext }: IDecryptUserDTO) {
    const [iv, encryptedText] = ciphertext.split(
      this.env.getCipherBreakpoint(),
    );
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
