import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersController } from './users.controller';
import { UserShouldNotAlreadyExistsToSignupPolicy } from './policy/alredy_exists.policy';
import { BcryptHashPasswordUseCase } from './use_case/hash_password.use_case';
import { RepositorySignupUserUseCase } from './use_case/signup.use_case';
import { PrismaUserRepository } from './repository/prisma/user.repository';

@Module({
  controllers: [UsersController],
  providers: [
    PrismaUserRepository,
    AuthService,
    UserShouldNotAlreadyExistsToSignupPolicy,
    BcryptHashPasswordUseCase,
    RepositorySignupUserUseCase,
  ],
})
export class UsersModule {}
