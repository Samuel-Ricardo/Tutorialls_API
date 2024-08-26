import { IAuthUserDTO } from 'src/domain/DTO/user/auth.dto';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { User } from 'src/domain/entity/user.entity';

export interface IAuthService {
  login(user: IAuthUserDTO): Promise<User>;
  signup(user: ISignupUserDTO): Promise<User>;
}
