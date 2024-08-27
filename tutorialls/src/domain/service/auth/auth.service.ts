import { IGenerateAuthTokenDTO } from 'src/domain/DTO/auth/token/generate.dto';
import { IValidateAuthToken } from 'src/domain/DTO/auth/token/validate.dto';

export interface IAuthService {
  authenticate(user: IGenerateAuthTokenDTO): Promise<string>;
  validate(user: IValidateAuthToken): Promise<boolean>;
}
