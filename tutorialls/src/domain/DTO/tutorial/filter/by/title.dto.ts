import { IListAllTutorialsDTO } from '../../list/all.dto';

export interface IFilterTutorialsByTitleDTO extends IListAllTutorialsDTO {
  title: string;
}
