export interface IPaginationOutputDTO<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
