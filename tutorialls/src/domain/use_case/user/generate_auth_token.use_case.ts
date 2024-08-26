import { IGenerateAuthTokenDTO } from 'src/domain/DTO/user/generate/token/auth.dto';

export interface IGenerateAuthTokenUseCase {
  execute(user: IGenerateAuthTokenDTO): Promise<string>;
}
