import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infra/engine/database/prisma/prisma.module';
import { Module } from './application/user/.module';
import { UsersModule } from './application/users/users/users.module';

@Module({
  imports: [PrismaModule, Module, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
