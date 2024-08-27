import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { IUserRepository } from 'src/domain/repository/user/user.repository';
import { ISignupUserUseCase } from 'src/domain/use_case/user/signup.use_case';

@Injectable()
export class RepositorySignupUserUseCase implements ISignupUserUseCase {
  constructor(
    @Inject(MODULE.USER.REPOSITORY.PRISMA)
    private readonly repository: IUserRepository,
  ) {}

  async execute(user: ISignupUserDTO) {
    return await this.repository.signup(user);
  }
}
