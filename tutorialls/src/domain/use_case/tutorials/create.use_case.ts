import { ICreateTutorialDTO } from 'src/domain/DTO/tutorial/create.dto';
import { Tutorial } from 'src/domain/entity/tutorial.entity';

export interface ICreateTutorialUseCase {
  execute(tutorial: ICreateTutorialDTO): Promise<Tutorial>;
}
