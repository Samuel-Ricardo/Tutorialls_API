import { Injectable } from '@nestjs/common';
import { IHashPasswordDTO } from 'src/domain/DTO/user/hash/password.dto';
import { IHashPasswordUseCase } from 'src/domain/use_case/user/security/hash_password.use_case';
import { EnvService } from 'src/infra/config/env/env.service';
import { bcrypt } from 'src/infra/engine/hashing/bcrypt.engine';

@Injectable()
export class BcryptHashPasswordUseCase implements IHashPasswordUseCase {
  execute({ password }: IHashPasswordDTO): Promise<string> {
    return bcrypt.hash(password, Number(EnvService.ENV.HASH.ROUNDS));
  }
}
