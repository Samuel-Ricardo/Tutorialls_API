import { Injectable } from '@nestjs/common';
import { IUserAlreadyExistsPolicyDTO } from 'src/domain/DTO/user/policy/alredy_exists.dto';
import { IUserAlreadyExistsPolicy } from 'src/domain/policy/user/alredy_exists.policy';
import { IUserRepository } from 'src/domain/repository/user/user.repository';

@Injectable()
export class UserAlredyExistsPolicy implements IUserAlreadyExistsPolicy {
  constructor(private readonly repository: IUserRepository) {}

  async execute({ email }: IUserAlreadyExistsPolicyDTO) {
    return (await this.repository.findByEmail({ email })) ? true : false;
  }
}
