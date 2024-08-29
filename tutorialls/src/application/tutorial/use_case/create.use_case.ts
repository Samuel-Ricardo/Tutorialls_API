import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { ICreateTutorialDTO } from 'src/domain/DTO/tutorial/create.dto';
import { ITutorialRepository } from 'src/domain/repository/tutorial/tutorial.repository';

@Injectable()
export class CreateTutorialUseCase {
  constructor(
    @Inject(MODULE.TUTORIAL.REPOSITORY.PRISMA)
    private readonly tutorialRepository: ITutorialRepository,
  ) {}

  async execute(tutorial: ICreateTutorialDTO) {
    return await this.tutorialRepository.create(tutorial);
  }
}
