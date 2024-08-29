import { IListAllTutorialsDTO } from '../../list/all.dto';

export interface IFilterTutorialsByContentDTO extends IListAllTutorialsDTO {
  keyword: string;
}
