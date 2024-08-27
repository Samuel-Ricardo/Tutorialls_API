import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { IUserAlreadyExistsPolicyDTO } from 'src/domain/DTO/user/policy/alredy_exists.dto';
import { IUserShouldNotAlreadyExistsToSignupPolicy } from 'src/domain/policy/user/signup_alredy_exists.policy';
import { IUserRepository } from 'src/domain/repository/user/user.repository';

@Injectable()
export class UserShouldNotAlreadyExistsToSignupPolicy
  implements IUserShouldNotAlreadyExistsToSignupPolicy
{
  constructor(
    @Inject(MODULE.USER.REPOSITORY.PRISMA)
    private readonly repository: IUserRepository,
  ) {}

  async execute({ email }: IUserAlreadyExistsPolicyDTO) {
    return (await this.repository.findByEmail({ email })) ? true : false;
  }
}
