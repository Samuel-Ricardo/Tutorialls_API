import { Injectable } from '@nestjs/common';
import { createCipheriv, randomBytes } from 'node:crypto';
import { IEncryptUserDTO } from 'src/domain/DTO/security/user/encrypt.dto';
import { IEncryptUserUseCase } from 'src/domain/use_case/user/security/encrypt.use_case';

@Injectable()
export class NodeEncryptUserUseCase implements IEncryptUserUseCase {
  private readonly algorithm = 'aes-256-ctr';
  private readonly secretKey = 'secret';
  private readonly iv = randomBytes(16);

  async execute({ user }: IEncryptUserDTO) {
    const cipher = createCipheriv(this.algorithm, this.secretKey, this.iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(user.toDTO())),
      cipher.final(),
    ]);
    return `${this.iv.toString('hex')}:${encrypted.toString('hex')}`;
  }
}
