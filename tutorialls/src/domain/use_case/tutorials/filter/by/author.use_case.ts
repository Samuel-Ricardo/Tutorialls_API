import { IPaginationOutputDTO } from 'src/domain/DTO/pagination/output.dto';
import { Tutorial } from 'src/domain/entity/tutorial.entity';

export interface IFilterTutorialsByAuthorUseCase {
  execute(
    DTO: IFilterTutorialsByAuthorUseCase,
  ): Promise<IPaginationOutputDTO<Tutorial>>;
}
