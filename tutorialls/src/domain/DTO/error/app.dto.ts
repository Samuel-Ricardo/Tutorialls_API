export interface IErrorDTO {
  name?: string;
  message: string;
  status: number;
  data?: any;
  error: boolean;
  url?: string;
}
