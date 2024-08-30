import { Test, TestingModule } from '@nestjs/testing';

import { MODULE } from 'src/app.registry';
import { ICreateTutorialUseCase } from 'src/domain/use_case/tutorials/create.use_case';
import { IUpdateTutorialUseCase } from 'src/domain/use_case/tutorials/update.use_case';
import { IDeleteTutorialUseCase } from 'src/domain/use_case/tutorials/delete.use_case';
import { IListAllTutorialsUseCase } from 'src/domain/use_case/tutorials/list/all.use_case';
import { IFilterTutorialsByAuthorUseCase } from 'src/domain/use_case/tutorials/filter/by/author.use_case';
import { IFilterTutorialsByTitleUseCase } from 'src/domain/use_case/tutorials/filter/by/title.use_case';
import { IFilterTutorialsByKeywordUseCase } from 'src/domain/use_case/tutorials/filter/by/keyword.use_case';
import { ICreateTutorialDTO } from 'src/domain/DTO/tutorial/create.dto';
import { IUpdateTutorialDTO } from 'src/domain/DTO/tutorial/update.dto';
import { IListAllTutorialsDTO } from 'src/domain/DTO/tutorial/list/all.dto';
import { IFilterTutorialsByTitleDTO } from 'src/domain/DTO/tutorial/filter/by/title.dto';
import { TutorialService } from './tutorial.service';

describe('TutorialService', () => {
  let service: TutorialService;
  let createTutorialUseCase: ICreateTutorialUseCase;
  let updateTutorialUseCase: IUpdateTutorialUseCase;
  let deleteTutorialUseCase: IDeleteTutorialUseCase;
  let listAllTutorialsUseCase: IListAllTutorialsUseCase;
  let filterByAuthorUseCase: IFilterTutorialsByAuthorUseCase;
  let filterByTitleUseCase: IFilterTutorialsByTitleUseCase;
  let filterByKeywordUseCase: IFilterTutorialsByKeywordUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorialService,
        {
          provide: MODULE.TUTORIAL.USE_CASE.CREATE,
          useValue: { execute: jest.fn() },
        },
        {
          provide: MODULE.TUTORIAL.USE_CASE.UPDATE,
          useValue: { execute: jest.fn() },
        },
        {
          provide: MODULE.TUTORIAL.USE_CASE.DELETE,
          useValue: { execute: jest.fn() },
        },
        {
          provide: MODULE.TUTORIAL.USE_CASE.LIST.ALL,
          useValue: { execute: jest.fn() },
        },
        {
          provide: MODULE.TUTORIAL.USE_CASE.FILTER.BY.AUTHOR,
          useValue: { execute: jest.fn() },
        },
        {
          provide: MODULE.TUTORIAL.USE_CASE.FILTER.BY.TITLE,
          useValue: { execute: jest.fn() },
        },
        {
          provide: MODULE.TUTORIAL.USE_CASE.FILTER.BY.KEYWORD,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TutorialService>(TutorialService);
    createTutorialUseCase = module.get<ICreateTutorialUseCase>(
      MODULE.TUTORIAL.USE_CASE.CREATE,
    );
    updateTutorialUseCase = module.get<IUpdateTutorialUseCase>(
      MODULE.TUTORIAL.USE_CASE.UPDATE,
    );
    deleteTutorialUseCase = module.get<IDeleteTutorialUseCase>(
      MODULE.TUTORIAL.USE_CASE.DELETE,
    );
    listAllTutorialsUseCase = module.get<IListAllTutorialsUseCase>(
      MODULE.TUTORIAL.USE_CASE.LIST.ALL,
    );
    filterByAuthorUseCase = module.get<IFilterTutorialsByAuthorUseCase>(
      MODULE.TUTORIAL.USE_CASE.FILTER.BY.AUTHOR,
    );
    filterByTitleUseCase = module.get<IFilterTutorialsByTitleUseCase>(
      MODULE.TUTORIAL.USE_CASE.FILTER.BY.TITLE,
    );
    filterByKeywordUseCase = module.get<IFilterTutorialsByKeywordUseCase>(
      MODULE.TUTORIAL.USE_CASE.FILTER.BY.KEYWORD,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call createTutorialUseCase.execute on create', async () => {
    const createDTO: ICreateTutorialDTO = {
      title: 'New Tutorial',
      content: 'Tutorial Content',
      author: 'John Doe',
    };
    await service.create(createDTO);
    expect(createTutorialUseCase.execute).toHaveBeenCalledWith(createDTO);
  });

  it('should call updateTutorialUseCase.execute on update', async () => {
    const updateDTO: IUpdateTutorialDTO = {
      id: '1',
      title: 'Updated Title',
      content: 'Updated Content',
      author: 'Updated Author',
    };
    await service.update(updateDTO);
    expect(updateTutorialUseCase.execute).toHaveBeenCalledWith(updateDTO);
  });

  it('should call deleteTutorialUseCase.execute on delete', async () => {
    const deleteDTO = { id: '1' };
    await service.delete(deleteDTO);
    expect(deleteTutorialUseCase.execute).toHaveBeenCalledWith(deleteDTO);
  });

  it('should call listAllTutorialsUseCase.execute on listAll', async () => {
    const listAllDTO: IListAllTutorialsDTO = {
      pagination: {
        limit: 10,
        page: 1,
      },
    };
    await service.listAll(listAllDTO);
    expect(listAllTutorialsUseCase.execute).toHaveBeenCalledWith(listAllDTO);
  });

  it('should call filterByTitleUseCase.execute on filterByTitle', async () => {
    const filterByTitleDTO: IFilterTutorialsByTitleDTO = {
      title: 'Tutorial',
      page: 1,
      limit: 10,
    };
    await service.filterByTitle(filterByTitleDTO);
    expect(filterByTitleUseCase.execute).toHaveBeenCalledWith(filterByTitleDTO);
  });

  it('should call filterByAuthorUseCase.execute on filterByAuthor', async () => {
    const filterByAuthorDTO = { author: 'Author Name', page: 1, limit: 10 };
    await service.filterByAuthor(filterByAuthorDTO);
    expect(filterByAuthorUseCase.execute).toHaveBeenCalledWith(
      filterByAuthorDTO,
    );
  });

  it('should call filterByKeywordUseCase.execute on filterByKeywordInContent', async () => {
    const filterByKeywordDTO = { keyword: 'Keyword', page: 1, limit: 10 };
    await service.filterByKeywordInContent(filterByKeywordDTO);
    expect(filterByKeywordUseCase.execute).toHaveBeenCalledWith(
      filterByKeywordDTO,
    );
  });
});
