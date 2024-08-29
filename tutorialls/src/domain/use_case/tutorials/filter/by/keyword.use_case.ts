import { IPaginationOutputDTO } from 'src/domain/DTO/pagination/output.dto';
import { Tutorial } from 'src/domain/entity/tutorial.entity';
import { IFilterTutorialsByTitleUseCase } from './title.use_case';

export interface IFilterTutorialsByKeywordUseCase {
  execute(
    DTO: IFilterTutorialsByTitleUseCase,
  ): Promise<IPaginationOutputDTO<Tutorial>>;
}
