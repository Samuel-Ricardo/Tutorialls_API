import { IPaginationOutputDTO } from 'src/domain/DTO/pagination/output.dto';
import { ICreateTutorialDTO } from 'src/domain/DTO/tutorial/create.dto';
import { IDeleteTutorialDTO } from 'src/domain/DTO/tutorial/delete.dto';
import { IFilterTutorialsByAuthorDTO } from 'src/domain/DTO/tutorial/filter/by/author.dto';
import { IFilterTutorialsByContentDTO } from 'src/domain/DTO/tutorial/filter/by/content.dto';
import { IFilterTutorialsByTitleDTO } from 'src/domain/DTO/tutorial/filter/by/title.dto';
import { IListAllTutorialsDTO } from 'src/domain/DTO/tutorial/list/all.dto';
import { IUpdateTutorialDTO } from 'src/domain/DTO/tutorial/update.dto';
import { Tutorial } from 'src/domain/entity/tutorial.entity';

export interface ITutorialRepository {
  create(tutorial: ICreateTutorialDTO): Promise<Tutorial>;
  update(tutorial: IUpdateTutorialDTO): Promise<Tutorial>;
  delete(tutorial: IDeleteTutorialDTO): Promise<boolean>;
  listAll(DTO: IListAllTutorialsDTO): Promise<IPaginationOutputDTO<Tutorial>>;
  findByTitle(
    DTO: IFilterTutorialsByTitleDTO,
  ): Promise<IPaginationOutputDTO<Tutorial>>;
  findByAuthor(
    DTO: IFilterTutorialsByAuthorDTO,
  ): Promise<IPaginationOutputDTO<Tutorial>>;
  findByKeywordInContent(
    DTO: IFilterTutorialsByContentDTO,
  ): Promise<IPaginationOutputDTO<Tutorial>>;
}
