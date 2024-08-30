import { PaginationDTO } from 'src/domain/DTO/pagination.dto';

export interface IFilterTutorialsByTitleDTO extends PaginationDTO {
  title: string;
}
