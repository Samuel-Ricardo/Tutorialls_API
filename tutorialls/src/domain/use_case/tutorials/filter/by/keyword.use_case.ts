import { IPaginationOutputDTO } from 'src/domain/DTO/pagination/output.dto';
import { Tutorial } from 'src/domain/entity/tutorial.entity';
import { IFilterTutorialsByContentDTO } from 'src/domain/DTO/tutorial/filter/by/content.dto';

export interface IFilterTutorialsByKeywordUseCase {
  execute(
    DTO: IFilterTutorialsByContentDTO,
  ): Promise<IPaginationOutputDTO<Tutorial>>;
}
