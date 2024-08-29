import { IPaginationOutputDTO } from 'src/domain/DTO/pagination/output.dto';
import { IFilterTutorialsByAuthorDTO } from 'src/domain/DTO/tutorial/filter/by/author.dto';
import { Tutorial } from 'src/domain/entity/tutorial.entity';

export interface IFilterTutorialsByAuthorUseCase {
  execute(
    DTO: IFilterTutorialsByAuthorDTO,
  ): Promise<IPaginationOutputDTO<Tutorial>>;
}
