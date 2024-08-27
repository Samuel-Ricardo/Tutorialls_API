import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UsersController } from './users.controller';
import { UserShouldNotAlreadyExistsToSignupPolicy } from './policy/alredy_exists.policy';
import { BcryptHashPasswordUseCase } from './use_case/hash_password.use_case';
import { RepositorySignupUserUseCase } from './use_case/signup.use_case';
import { PrismaUserRepository } from './repository/prisma/user.repository';
import { MODULE } from 'src/app.registry';
import { PrismaModule } from 'src/infra/engine/database/prisma/prisma.module';
import { UserShouldExistsToAuthPolicy } from './policy/should_exists.policy';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [UsersController],
  imports: [PrismaModule, AuthModule],
  providers: [
    {
      provide: MODULE.USER.POLICY.ALREDY_EXISTS,
      useClass: UserShouldNotAlreadyExistsToSignupPolicy,
    },
    {
      provide: MODULE.USER.POLICY.SHOULD_EXISTS,
      useClass: UserShouldExistsToAuthPolicy,
    },
    {
      provide: MODULE.USER.POLICY.IS_VALID_PASSWORD,
      useClass: UserShouldExistsToAuthPolicy,
    },
    {
      provide: MODULE.USER.USE_CASE.HASH.PASSWORD,
      useClass: BcryptHashPasswordUseCase,
    },
    {
      provide: MODULE.USER.USE_CASE.SIGNUP,
      useClass: RepositorySignupUserUseCase,
    },
    {
      provide: MODULE.USER.REPOSITORY.PRISMA,
      useClass: PrismaUserRepository,
    },
    {
      provide: MODULE.USER.SERVICE.AUTH,
      useClass: UserService,
    },
  ],
  exports: [
    {
      provide: MODULE.USER.SERVICE.AUTH,
      useClass: UserService,
    },
  ],
})
export class UsersModule {}
