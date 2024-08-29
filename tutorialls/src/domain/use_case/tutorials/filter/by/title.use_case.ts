import { IPaginationOutputDTO } from 'src/domain/DTO/pagination/output.dto';
import { Tutorial } from 'src/domain/entity/tutorial.entity';

export interface IFilterTutorialsByTitleUseCase {
  execute(
    DTO: IFilterTutorialsByTitleUseCase,
  ): Promise<IPaginationOutputDTO<Tutorial>>;
}
