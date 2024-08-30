import { Module } from '@nestjs/common';
import { TutorialService } from './tutorial.service';
import { TutorialController } from './tutorial.controller';
import { MODULE } from 'src/app.registry';
import { PrismaTutorialRepository } from './repository/prisma/tutorial.repositiry';
import { PrismaModule } from 'src/infra/engine/database/prisma/prisma.module';
import { CreateTutorialUseCase } from './use_case/create.use_case';
import { UpdateTutorialUseCase } from './use_case/update.use_case';
import { DeleteTutorialUseCase } from './use_case/delete.use_case';
import { FilterTutorialsByAuthorUseCase } from './use_case/filter/by/author.use_case';
import { FilterTutorialsByTitleUseCase } from './use_case/filter/by/title.use_case';
import { ListAllTutotialsUseCase } from './use_case/list/all.use_case';
import { FilterTutorialsByKeywordUseCase } from './use_case/filter/by/keyword.use_case';
import { CacheModule } from '@nestjs/cache-manager';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { redisStore } from 'cache-manager-redis-store';
import { EnvService } from 'src/infra/config/env/env.service';
import { ConfigModule } from 'src/infra/config/config.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule.register({
      imports: [ConfigModule],
      useFactory: (env: EnvService) => ({
        isGlobal: true,
        store: redisStore as any,
        host: env.getRedisHost(),
        port: env.getRedisPort(),
        ttl: env.getCacheTTL(),
      }),
      inject: [EnvService],
    }),
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://admin:admin@rabbitmq:5672'],
          queue: 'tutorials_queue',
          queueOptions: {
            durable: false, //INFO: memory vs disk
          },
        },
      },
    ]),
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_SERVICE',
        imports: [ConfigModule],
        useFactory: async (config: EnvService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getRabbitMQUrl()],
            queue: config.getRabbitMQQueue(),
            queueOptions: {
              durable: false,
            },
          },
        }),
        inject: [EnvService],
      },
    ]),
  ],
  controllers: [TutorialController],
  providers: [
    { provide: MODULE.TUTORIAL.SERVICE.MAIN, useClass: TutorialService },
    {
      provide: MODULE.TUTORIAL.REPOSITORY.PRISMA,
      useClass: PrismaTutorialRepository,
    },
    {
      provide: MODULE.TUTORIAL.USE_CASE.CREATE,
      useClass: CreateTutorialUseCase,
    },
    {
      provide: MODULE.TUTORIAL.USE_CASE.UPDATE,
      useClass: UpdateTutorialUseCase,
    },
    {
      provide: MODULE.TUTORIAL.USE_CASE.DELETE,
      useClass: DeleteTutorialUseCase,
    },
    {
      provide: MODULE.TUTORIAL.USE_CASE.LIST.ALL,
      useClass: ListAllTutotialsUseCase,
    },
    {
      provide: MODULE.TUTORIAL.USE_CASE.FILTER.BY.AUTHOR,
      useClass: FilterTutorialsByAuthorUseCase,
    },
    {
      provide: MODULE.TUTORIAL.USE_CASE.FILTER.BY.TITLE,
      useClass: FilterTutorialsByTitleUseCase,
    },

    {
      provide: MODULE.TUTORIAL.USE_CASE.FILTER.BY.KEYWORD,
      useClass: FilterTutorialsByKeywordUseCase,
    },
  ],
  exports: [
    { provide: MODULE.TUTORIAL.SERVICE.MAIN, useClass: TutorialService },
  ],
})
export class TutorialModule {}
