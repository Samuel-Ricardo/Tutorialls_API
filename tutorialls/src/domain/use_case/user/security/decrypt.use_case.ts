import { IDecryptUserDTO } from 'src/domain/DTO/security/user/decrypt.dto';
import { IUserDTO } from 'src/domain/DTO/user/user.dto';

export interface IDecryptUserUseCase {
  execute(user: IDecryptUserDTO): Promise<IUserDTO>;
}
