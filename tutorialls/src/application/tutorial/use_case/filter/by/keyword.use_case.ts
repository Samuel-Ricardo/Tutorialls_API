import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { IFilterTutorialsByContentDTO } from 'src/domain/DTO/tutorial/filter/by/content.dto';
import { ITutorialRepository } from 'src/domain/repository/tutorial/tutorial.repository';
import { IFilterTutorialsByKeywordUseCase } from 'src/domain/use_case/tutorials/filter/by/keyword.use_case';

@Injectable()
export class FilterTutorialsByKeywordUseCase
  implements IFilterTutorialsByKeywordUseCase
{
  constructor(
    @Inject(MODULE.TUTORIAL.REPOSITORY.PRISMA)
    private readonly tutorialRepository: ITutorialRepository,
  ) {}
  async execute(tutorial: IFilterTutorialsByContentDTO) {
    return await this.tutorialRepository.findByKeywordInContent(tutorial);
  }
}
