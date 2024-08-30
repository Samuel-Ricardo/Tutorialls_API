import { PaginationDTO } from 'src/domain/DTO/pagination.dto';

export interface IFilterTutorialsByContentDTO extends PaginationDTO {
  keyword: string;
}
