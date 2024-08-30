import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { IDeleteTutorialDTO } from 'src/domain/DTO/tutorial/delete.dto';
import { ITutorialRepository } from 'src/domain/repository/tutorial/tutorial.repository';
import { IDeleteTutorialUseCase } from 'src/domain/use_case/tutorials/delete.use_case';

@Injectable()
export class DeleteTutorialUseCase implements IDeleteTutorialUseCase {
  constructor(
    @Inject(MODULE.TUTORIAL.REPOSITORY.PRISMA)
    private readonly tutorialRepository: ITutorialRepository,
  ) {}
  async execute(tutorial: IDeleteTutorialDTO) {
    return await this.tutorialRepository.delete(tutorial);
  }
}
