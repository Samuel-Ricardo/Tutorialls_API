import { Injectable, Inject } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { IListAllTutorialsDTO } from 'src/domain/DTO/tutorial/list/all.dto';
import { ITutorialRepository } from 'src/domain/repository/tutorial/tutorial.repository';
import { IListAllTutorialsUseCase } from 'src/domain/use_case/tutorials/list/all.use_case';

@Injectable()
export class ListAllTutotialsUseCase implements IListAllTutorialsUseCase {
  constructor(
    @Inject(MODULE.TUTORIAL.REPOSITORY.PRISMA)
    private readonly repository: ITutorialRepository,
  ) {}
  async execute(tutorial: IListAllTutorialsDTO) {
    return await this.repository.listAll(tutorial);
  }
}
