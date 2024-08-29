import { ICreateTutorialDTO } from 'src/domain/DTO/tutorial/create.dto';
import { IUpdateTutorialDTO } from 'src/domain/DTO/tutorial/update.dto';
import { Tutorial } from 'src/domain/entity/tutorial.entity';

export interface IUpdateTutorialUseCase {
  execute(tutorial: IUpdateTutorialDTO): Promise<Tutorial>;
}
