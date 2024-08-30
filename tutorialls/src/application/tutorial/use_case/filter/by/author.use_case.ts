import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { IFilterTutorialsByAuthorDTO } from 'src/domain/DTO/tutorial/filter/by/author.dto';
import { ITutorialRepository } from 'src/domain/repository/tutorial/tutorial.repository';
import { IFilterTutorialsByAuthorUseCase } from 'src/domain/use_case/tutorials/filter/by/author.use_case';

@Injectable()
export class FilterTutorialsByAuthorUseCase
  implements IFilterTutorialsByAuthorUseCase
{
  constructor(
    @Inject(MODULE.TUTORIAL.REPOSITORY.PRISMA)
    private readonly tutorialRepository: ITutorialRepository,
  ) {}

  async execute(tutorial: IFilterTutorialsByAuthorDTO) {
    return await this.tutorialRepository.findByAuthor(tutorial);
  }
}
