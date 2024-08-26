import { Module } from '@nestjs/common';
import { AuthService } from './users.service';
import { UsersController } from './users.controller';
import { UserShouldNotAlreadyExistsToSignupPolicy } from './policy/alredy_exists.policy';
import { BcryptHashPasswordUseCase } from './use_case/hash_password.use_case';
import { RepositorySignupUserUseCase } from './use_case/signup.use_case';

@Module({
  controllers: [UsersController],
  providers: [
    AuthService,
    UserShouldNotAlreadyExistsToSignupPolicy,
    BcryptHashPasswordUseCase,
    RepositorySignupUserUseCase,
  ],
})
export class UsersModule {}
