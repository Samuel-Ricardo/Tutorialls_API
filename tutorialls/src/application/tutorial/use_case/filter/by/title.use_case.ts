import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { IFilterTutorialsByTitleDTO } from 'src/domain/DTO/tutorial/filter/by/title.dto';
import { ITutorialRepository } from 'src/domain/repository/tutorial/tutorial.repository';
import { IFilterTutorialsByTitleUseCase } from 'src/domain/use_case/tutorials/filter/by/title.use_case';

@Injectable()
export class FilterTutorialsByTitleUseCase
  implements IFilterTutorialsByTitleUseCase
{
  constructor(
    @Inject(MODULE.TUTORIAL.REPOSITORY.PRISMA)
    private readonly tutorialRepository: ITutorialRepository,
  ) {}
  async execute(tutorial: IFilterTutorialsByTitleDTO) {
    return await this.tutorialRepository.findByTitle(tutorial);
  }
}
