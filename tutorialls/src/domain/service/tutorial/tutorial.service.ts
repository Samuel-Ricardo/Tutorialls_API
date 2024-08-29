import { IPaginationOutputDTO } from 'src/domain/DTO/pagination/output.dto';
import { ICreateTutorialDTO } from 'src/domain/DTO/tutorial/create.dto';
import { IFilterTutorialsByContentDTO } from 'src/domain/DTO/tutorial/filter/by/content.dto';
import { IFilterTutorialsByTitleDTO } from 'src/domain/DTO/tutorial/filter/by/title.dto';
import { IListAllTutorialsDTO } from 'src/domain/DTO/tutorial/list/all.dto';

import { Tutorial } from '../../entity/tutorial.entity';
import { IUpdateTutorialDTO } from 'src/domain/DTO/tutorial/update.dto';
import { IDeleteTutorialDTO } from 'src/domain/DTO/tutorial/delete.dto';

export interface ITutorialService {
  create(tutorial: ICreateTutorialDTO): Promise<Tutorial>;
  update(tutorial: IUpdateTutorialDTO): Promise<Tutorial>;
  delete(tutorial: IDeleteTutorialDTO): Promise<boolean>;

  listAll(DTO: IListAllTutorialsDTO): Promise<IPaginationOutputDTO<Tutorial>>;
  filterByTitle(
    DTO: IFilterTutorialsByTitleDTO,
  ): Promise<IPaginationOutputDTO<Tutorial>>;
  filterByCreator(
    DTO: IFilterTutorialsByTitleDTO,
  ): Promise<IPaginationOutputDTO<Tutorial>>;
  filterByKeywordInContent(
    DTO: IFilterTutorialsByContentDTO,
  ): Promise<IPaginationOutputDTO<Tutorial>>;
}
