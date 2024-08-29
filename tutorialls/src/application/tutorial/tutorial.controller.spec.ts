import { Test, TestingModule } from '@nestjs/testing';
import { TutorialController } from './tutorial.controller';
import { MODULE } from 'src/app.registry';
import { ITutorialService } from 'src/domain/service/tutorial/tutorial.service';
import { ICreateTutorialDTO } from 'src/domain/DTO/tutorial/create.dto';

describe('TutorialController', () => {
  let controller: TutorialController;
  let service: ITutorialService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TutorialController],
      providers: [
        {
          provide: MODULE.TUTORIAL.SERVICE.MAIN,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            listAll: jest.fn(),
            filterByTitle: jest.fn(),
            filterByAuthor: jest.fn(),
            filterByKeywordInContent: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TutorialController>(TutorialController);
    service = module.get<ITutorialService>(MODULE.TUTORIAL.SERVICE.MAIN);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.create on create', async () => {
    const createDTO: ICreateTutorialDTO = {
      title: 'New Tutorial',
      content: 'Content',
      author: 'Author Name',
    };
    await controller.create(createDTO);
    expect(service.create).toHaveBeenCalledWith(createDTO);
  });

  it('should call service.listAll on listAll', async () => {
    const paginationDTO = { page: 1, limit: 10 };
    await controller.listAll(paginationDTO);
    expect(service.listAll).toHaveBeenCalledWith({ pagination: paginationDTO });
  });

  it('should call service.filterByTitle on filterByTitle', async () => {
    const filterByTitleDTO = { title: 'Tutorial', page: 1, limit: 10 };
    await controller.filterByTitle(filterByTitleDTO);
    expect(service.filterByTitle).toHaveBeenCalledWith(filterByTitleDTO);
  });

  it('should call service.filterByAuthor on filterByAuthor', async () => {
    const filterByAuthorDTO = { author: 'Author Name', page: 1, limit: 10 };
    await controller.filterByAuthor(filterByAuthorDTO);
    expect(service.filterByAuthor).toHaveBeenCalledWith(filterByAuthorDTO);
  });

  it('should call service.filterByKeywordInContent on filterByKeywordInContent', async () => {
    const filterByKeywordDTO = { keyword: 'Keyword', page: 1, limit: 10 };
    await controller.filterByKeywordInContent(filterByKeywordDTO);
    expect(service.filterByKeywordInContent).toHaveBeenCalledWith(
      filterByKeywordDTO,
    );
  });

  it('should call service.update on update', async () => {
    const id = '1';
    const updateDTO = {
      title: 'Updated Title',
      content: 'Updated Content',
      author: 'Updated Author',
    };
    await controller.update(id, updateDTO);
    expect(service.update).toHaveBeenCalledWith({ ...updateDTO, id });
  });

  it('should call service.delete on remove', async () => {
    const id = '1';
    await controller.remove(id);
    expect(service.delete).toHaveBeenCalledWith({ id });
  });
});
