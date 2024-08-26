import { Injectable } from '@nestjs/common';
import { IUserPasswordIsValidDTO } from 'src/domain/DTO/user/policy/password_is_valid.dto';
import { IPasswordShouldBeValidToLoginPolicy } from 'src/domain/policy/user/password_is_valid.policy';
import { bcrypt } from 'src/infra/engine/hashing/bcrypt.engine';

@Injectable()
export class BcryptPasswordShouldBeValidToLoginPolicy
  implements IPasswordShouldBeValidToLoginPolicy
{
  async execute({
    login_password,
    registered_password,
  }: IUserPasswordIsValidDTO) {
    return bcrypt.compare(login_password, registered_password);
  }
}
