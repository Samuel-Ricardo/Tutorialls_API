import { Module } from '@nestjs/common';
import { AuthService } from './users.service';
import { UsersController } from './users.controller';
import { UserAlredyExistsPolicy } from './policy/alredy_exists.policy';

@Module({
  controllers: [UsersController],
  providers: [AuthService, UserAlredyExistsPolicy],
})
export class UsersModule {}
