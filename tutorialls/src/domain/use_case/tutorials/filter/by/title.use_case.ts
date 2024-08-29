import { IPaginationOutputDTO } from 'src/domain/DTO/pagination/output.dto';
import { IFilterTutorialsByTitleDTO } from 'src/domain/DTO/tutorial/filter/by/title.dto';
import { Tutorial } from 'src/domain/entity/tutorial.entity';

export interface IFilterTutorialsByTitleUseCase {
  execute(
    DTO: IFilterTutorialsByTitleDTO,
  ): Promise<IPaginationOutputDTO<Tutorial>>;
}
