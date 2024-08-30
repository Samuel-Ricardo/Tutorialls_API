import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './application/users/users.module';
import { PrismaModule } from './infra/engine/database/prisma/prisma.module';
import { AuthModule } from './application/auth/auth.module';
import { EncryptionModule } from './application/encryption/encryption.module';
import { ConfigModule } from '@nestjs/config';
import { ConfigModule as AppConfigModule } from './infra/config/config.module';
import { TutorialModule } from './application/tutorial/tutorial.module';
import { CacheModule } from '@nestjs/cache-manager';
import { EnvService } from './infra/config/env/env.service';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.registerAsync({
      imports: [AppConfigModule],
      useFactory: async (env: EnvService) => ({
        isGlobal: true,
        store: redisStore as any,
        host: env.getRedisHost(),
        port: env.getRedisPort(),
        ttl: env.getCacheTTL(),
      }),
      inject: [EnvService],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    EncryptionModule,
    AppConfigModule,
    TutorialModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
