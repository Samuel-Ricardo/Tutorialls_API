import { Injectable } from '@nestjs/common';
import { IPaginationOutputDTO } from 'src/domain/DTO/pagination/output.dto';
import { ICreateTutorialDTO } from 'src/domain/DTO/tutorial/create.dto';
import { IDeleteTutorialDTO } from 'src/domain/DTO/tutorial/delete.dto';
import { IFilterTutorialsByAuthorDTO } from 'src/domain/DTO/tutorial/filter/by/author.dto';
import { IFilterTutorialsByContentDTO } from 'src/domain/DTO/tutorial/filter/by/content.dto';
import { IFilterTutorialsByTitleDTO } from 'src/domain/DTO/tutorial/filter/by/title.dto';
import { IListAllTutorialsDTO } from 'src/domain/DTO/tutorial/list/all.dto';
import { IUpdateTutorialDTO } from 'src/domain/DTO/tutorial/update.dto';
import { Tutorial } from 'src/domain/entity/tutorial.entity';
import { ITutorialService } from 'src/domain/service/tutorial/tutorial.service';

@Injectable()
export class TutorialService implements ITutorialService {
  constructor() {}
  create(tutorial: ICreateTutorialDTO): Promise<Tutorial> {
    throw new Error('Method not implemented.');
  }
  update(tutorial: IUpdateTutorialDTO): Promise<Tutorial> {
    throw new Error('Method not implemented.');
  }
  delete(tutorial: IDeleteTutorialDTO): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
  listAll(DTO: IListAllTutorialsDTO): Promise<IPaginationOutputDTO<Tutorial>> {
    throw new Error('Method not implemented.');
  }
  filterByTitle(
    DTO: IFilterTutorialsByTitleDTO,
  ): Promise<IPaginationOutputDTO<Tutorial>> {
    throw new Error('Method not implemented.');
  }
  filterByAuthor(
    DTO: IFilterTutorialsByAuthorDTO,
  ): Promise<IPaginationOutputDTO<Tutorial>> {
    throw new Error('Method not implemented.');
  }
  filterByKeywordInContent(
    DTO: IFilterTutorialsByContentDTO,
  ): Promise<IPaginationOutputDTO<Tutorial>> {
    throw new Error('Method not implemented.');
  }
}
