import { PaginationDTO } from 'src/domain/DTO/pagination.dto';

export interface IFilterTutorialsByAuthorDTO extends PaginationDTO {
  author: string;
}
