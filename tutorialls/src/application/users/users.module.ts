import { Module } from '@nestjs/common';
import { AuthService } from './users.service';
import { UsersController } from './users.controller';
import { UserAlredyExistsPolicy } from './policy/alredy_exists.policy';
import { BcryptHashPasswordUseCase } from './use_case/hash_password.use_case';

@Module({
  controllers: [UsersController],
  providers: [AuthService, UserAlredyExistsPolicy, BcryptHashPasswordUseCase],
})
export class UsersModule {}
