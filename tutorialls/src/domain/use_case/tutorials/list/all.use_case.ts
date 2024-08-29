import { IPaginationOutputDTO } from 'src/domain/DTO/pagination/output.dto';
import { IListAllTutorialsDTO } from 'src/domain/DTO/tutorial/list/all.dto';
import { Tutorial } from 'src/domain/entity/tutorial.entity';

export interface IListAllTutorialsUseCase {
  execute(DTO: IListAllTutorialsDTO): Promise<IPaginationOutputDTO<Tutorial>>;
}
