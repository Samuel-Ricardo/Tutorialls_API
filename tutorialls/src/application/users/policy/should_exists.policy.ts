import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { IUserAlreadyExistsPolicyDTO } from 'src/domain/DTO/user/policy/alredy_exists.dto';
import { IUserShouldExistsToAuthPolicy } from 'src/domain/policy/user/login_alredy_exists.policy';
import { IUserRepository } from 'src/domain/repository/user/user.repository';

@Injectable()
export class UserShouldExistsToAuthPolicy
  implements IUserShouldExistsToAuthPolicy
{
  constructor(
    @Inject(MODULE.USER.REPOSITORY.PRISMA)
    private readonly repository: IUserRepository,
  ) {}

  async execute(user: IUserAlreadyExistsPolicyDTO) {
    return await this.repository.findByEmail(user);
  }
}
