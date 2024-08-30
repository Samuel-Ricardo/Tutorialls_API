import { IDeleteTutorialDTO } from 'src/domain/DTO/tutorial/delete.dto';

export interface IDeleteTutorialUseCase {
  execute(tutorial: IDeleteTutorialDTO): Promise<boolean>;
}
