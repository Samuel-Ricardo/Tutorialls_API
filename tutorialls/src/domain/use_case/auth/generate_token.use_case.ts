import { IGenerateAuthTokenDTO } from 'src/domain/DTO/auth/token/generate.dto';

export interface IGenerateAuthTokenUseCase {
  execute(user: IGenerateAuthTokenDTO): Promise<string>;
}
