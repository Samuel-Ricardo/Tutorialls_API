import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { IDeleteTutorialDTO } from 'src/domain/DTO/tutorial/delete.dto';
import { ITutorialRepository } from 'src/domain/repository/tutorial/tutorial.repository';

@Injectable()
export class DeleteTutorialUseCase {
  constructor(
    @Inject(MODULE.TUTORIAL.REPOSITORY.PRISMA)
    private readonly tutorialRepository: ITutorialRepository,
  ) {}
  async execute(tutorial: IDeleteTutorialDTO) {
    return await this.tutorialRepository.delete(tutorial);
  }
}
