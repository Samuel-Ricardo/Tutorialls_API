import { IAuthUserDTO } from 'src/domain/DTO/user/auth.dto';
import { IRegisterUserDTO } from 'src/domain/DTO/user/register.dto';
import { User } from 'src/domain/entity/user.entity';

export interface IAuthService {
  login(user: IAuthUserDTO): Promise<User>;
  register(user: IRegisterUserDTO): Promise<User>;
}
