import { IValidateAuthTokenDTO } from 'src/domain/DTO/auth/token/validate.dto';

export interface IValidateAuthTokenUseCase {
  execute(user: IValidateAuthTokenDTO): Promise<boolean>;
}
