import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { MODULE } from 'src/app.registry';
import { PaginationDTO } from 'src/domain/DTO/pagination.dto';
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
  private static cacheKey(key: string, { limit, page }: PaginationDTO) {
    return `tutorial:${key}:${limit}:${page}`;
  }

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
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
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

    const key = TutorialService.cacheKey('listAll', DTO.pagination);
    const cache = await this.cache.get<any>(key);

    if (cache) {
      return cache;
    } else {
      await this.cache.set(key, result);
      return result;
    }
  }

  async filterByTitle(DTO: IFilterTutorialsByTitleDTO) {
    const result = await this.filterTutorialsByTitle.execute(DTO);

    const key = TutorialService.cacheKey('filterByTitle', DTO);
    const cache = await this.cache.get<any>(key);

    if (cache) {
      return cache;
    } else {
      await this.cache.set(key, result);
      return result;
    }
  }

  async filterByAuthor(DTO: IFilterTutorialsByAuthorDTO) {
    const result = await this.filterTutorialsByAuthor.execute(DTO);

    const key = TutorialService.cacheKey('filterByAuthor', DTO);
    const cache = await this.cache.get<any>(key);

    if (cache) {
      return cache;
    } else {
      await this.cache.set(key, result);
      return result;
    }
  }

  async filterByKeywordInContent(DTO: IFilterTutorialsByContentDTO) {
    const result = await this.filterTutorialsByContent.execute(DTO);

    const key = TutorialService.cacheKey('filterByKeywordInContent', DTO);
    const cache = await this.cache.get<any>(key);

    if (cache) {
      return cache;
    } else {
      await this.cache.set(key, result);
      return result;
    }
  }
}
