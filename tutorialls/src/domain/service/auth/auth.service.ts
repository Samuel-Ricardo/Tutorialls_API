import { IGenerateAuthTokenDTO } from 'src/domain/DTO/auth/token/generate.dto';
import { IValidateAuthTokenDTO } from 'src/domain/DTO/auth/token/validate.dto';

export interface IAuthService {
  authenticate(user: IGenerateAuthTokenDTO): Promise<string>;
  validate(user: IValidateAuthTokenDTO): Promise<boolean>;
}
