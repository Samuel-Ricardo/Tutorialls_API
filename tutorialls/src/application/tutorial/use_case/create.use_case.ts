import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { ICreateTutorialDTO } from 'src/domain/DTO/tutorial/create.dto';
import { ITutorialRepository } from 'src/domain/repository/tutorial/tutorial.repository';
import { ICreateTutorialUseCase } from 'src/domain/use_case/tutorials/create.use_case';

@Injectable()
export class CreateTutorialUseCase implements ICreateTutorialUseCase {
  constructor(
    @Inject(MODULE.TUTORIAL.REPOSITORY.PRISMA)
    private readonly tutorialRepository: ITutorialRepository,
  ) {}

  async execute(tutorial: ICreateTutorialDTO) {
    return await this.tutorialRepository.create(tutorial);
  }
}
