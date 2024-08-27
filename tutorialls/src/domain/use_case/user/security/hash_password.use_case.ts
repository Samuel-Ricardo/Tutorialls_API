import { IHashPasswordDTO } from 'src/domain/DTO/user/hash/password.dto';

export interface IHashPasswordUseCase {
  execute(user: IHashPasswordDTO): Promise<string>;
}
