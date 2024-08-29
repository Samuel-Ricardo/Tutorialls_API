import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { IUpdateTutorialDTO } from 'src/domain/DTO/tutorial/update.dto';
import { ITutorialRepository } from 'src/domain/repository/tutorial/tutorial.repository';
import { IUpdateTutorialUseCase } from 'src/domain/use_case/tutorials/update.use_case';

@Injectable()
export class UpdateTutorialUseCase implements IUpdateTutorialUseCase {
  constructor(
    @Inject(MODULE.TUTORIAL.REPOSITORY.PRISMA)
    private readonly tutorialRepository: ITutorialRepository,
  ) {}
  async execute(tutorial: IUpdateTutorialDTO) {
    return await this.tutorialRepository.update(tutorial);
  }
}
