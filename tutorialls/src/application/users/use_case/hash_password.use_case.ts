import { Injectable } from '@nestjs/common';
import { IHashPasswordDTO } from 'src/domain/DTO/user/hash/password.dto';
import { IHashPasswordUseCase } from 'src/domain/use_case/user/security/hash_password.use_case';
import { bcrypt } from 'src/infra/engine/hashing/bcrypt.engine';

@Injectable()
export class BcryptHashPasswordUseCase implements IHashPasswordUseCase {
  execute({ password }: IHashPasswordDTO): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
