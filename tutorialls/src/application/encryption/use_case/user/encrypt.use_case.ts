import { Injectable } from '@nestjs/common';
import { createCipheriv, randomBytes } from 'node:crypto';
import { IEncryptUserDTO } from 'src/domain/DTO/security/user/encrypt.dto';
import { IEncryptUserUseCase } from 'src/domain/use_case/user/security/encrypt.use_case';
import { EnvService } from 'src/infra/config/env/env.service';

@Injectable()
export class NodeEncryptUserUseCase implements IEncryptUserUseCase {
  private readonly algorithm: string;
  private readonly secretKey: string;
  private readonly iv = randomBytes(16);

  constructor(private readonly env: EnvService) {
    this.secretKey = this.env.getEncryptKey();
    this.algorithm = this.env.getEncryptAlgorithm();
  }

  async execute({ user }: IEncryptUserDTO) {
    const cipher = createCipheriv(this.algorithm, this.secretKey, this.iv);

    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(user)),
      cipher.final(),
    ]);

    return `${this.iv.toString('hex')}${this.env.getCipherBreakpoint()}${encrypted.toString('hex')}`;
  }
}
