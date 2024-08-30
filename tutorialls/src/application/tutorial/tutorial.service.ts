import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { ICreateTutorialDTO } from 'src/domain/DTO/tutorial/create.dto';
import { IDeleteTutorialDTO } from 'src/domain/DTO/tutorial/delete.dto';
import { IFilterTutorialsByAuthorDTO } from 'src/domain/DTO/tutorial/filter/by/author.dto';
import { IFilterTutorialsByContentDTO } from 'src/domain/DTO/tutorial/filter/by/content.dto';
import { IFilterTutorialsByTitleDTO } from 'src/domain/DTO/tutorial/filter/by/title.dto';
import { IListAllTutorialsDTO } from 'src/domain/DTO/tutorial/list/all.dto';
import { IUpdateTutorialDTO } from 'src/domain/DTO/tutorial/update.dto';
import { ITutorialService } from 'src/domain/service/tutorial/tutorial.service';
import { ICreateTutorialUseCase } from 'src/domain/use_case/tutorials/create.use_case';
import { IDeleteTutorialUseCase } from 'src/domain/use_case/tutorials/delete.use_case';
import { IFilterTutorialsByAuthorUseCase } from 'src/domain/use_case/tutorials/filter/by/author.use_case';
import { IFilterTutorialsByKeywordUseCase } from 'src/domain/use_case/tutorials/filter/by/keyword.use_case';
import { IFilterTutorialsByTitleUseCase } from 'src/domain/use_case/tutorials/filter/by/title.use_case';
import { IListAllTutorialsUseCase } from 'src/domain/use_case/tutorials/list/all.use_case';
import { IUpdateTutorialUseCase } from 'src/domain/use_case/tutorials/update.use_case';

@Injectable()
export class TutorialService implements ITutorialService {
  constructor(
    @Inject(MODULE.TUTORIAL.USE_CASE.CREATE)
    private readonly createTutorial: ICreateTutorialUseCase,
    @Inject(MODULE.TUTORIAL.USE_CASE.LIST.ALL)
    private readonly listAllTutorials: IListAllTutorialsUseCase,
    @Inject(MODULE.TUTORIAL.USE_CASE.FILTER.BY.TITLE)
    private readonly filterTutorialsByTitle: IFilterTutorialsByTitleUseCase,
    @Inject(MODULE.TUTORIAL.USE_CASE.FILTER.BY.AUTHOR)
    private readonly filterTutorialsByAuthor: IFilterTutorialsByAuthorUseCase,
    @Inject(MODULE.TUTORIAL.USE_CASE.FILTER.BY.KEYWORD)
    private readonly filterTutorialsByContent: IFilterTutorialsByKeywordUseCase,
    @Inject(MODULE.TUTORIAL.USE_CASE.UPDATE)
    private readonly updateTutorial: IUpdateTutorialUseCase,
    @Inject(MODULE.TUTORIAL.USE_CASE.DELETE)
    private readonly deleteTutorial: IDeleteTutorialUseCase,
  ) {}

  async create(tutorial: ICreateTutorialDTO) {
    return await this.createTutorial.execute(tutorial);
  }

  async update(tutorial: IUpdateTutorialDTO) {
    return await this.updateTutorial.execute(tutorial);
  }

  async delete(tutorial: IDeleteTutorialDTO) {
    return await this.deleteTutorial.execute(tutorial);
  }

  async listAll(DTO: IListAllTutorialsDTO) {
    const result = await this.listAllTutorials.execute(DTO);
    return result;
  }

  async filterByTitle(DTO: IFilterTutorialsByTitleDTO) {
    return await this.filterTutorialsByTitle.execute(DTO);
  }

  async filterByAuthor(DTO: IFilterTutorialsByAuthorDTO) {
    return await this.filterTutorialsByAuthor.execute(DTO);
  }

  async filterByKeywordInContent(DTO: IFilterTutorialsByContentDTO) {
    return await this.filterTutorialsByContent.execute(DTO);
  }
}
