import { IEncryptUserDTO } from 'src/domain/DTO/security/user/encrypt.dto';

export interface IEncryptUserUseCase {
  execute(user: IEncryptUserDTO): Promise<string>;
}
