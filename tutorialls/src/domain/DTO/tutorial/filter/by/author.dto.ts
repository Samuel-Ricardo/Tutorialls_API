import { IListAllTutorialsDTO } from '../../list/all.dto';

export interface IFilterTutorialsByAuthorDTO extends IListAllTutorialsDTO {
  author: string;
}
