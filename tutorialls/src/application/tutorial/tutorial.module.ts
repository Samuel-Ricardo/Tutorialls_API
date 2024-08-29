import { Module } from '@nestjs/common';
import { TutorialService } from './tutorial.service';
import { TutorialController } from './tutorial.controller';
import { MODULE } from 'src/app.registry';
import { PrismaTutorialRepository } from './repository/prisma/tutorial.repositiry';
import { PrismaModule } from 'src/infra/engine/database/prisma/prisma.module';

@Module({
  controllers: [TutorialController, PrismaModule],
  providers: [
    { provide: MODULE.TUTORIAL.SERVICE.MAIN, useClass: TutorialService },
    {
      provide: MODULE.TUTORIAL.REPOSITORY.PRISMA,
      useClass: PrismaTutorialRepository,
    },
  ],
})
export class TutorialModule {}
