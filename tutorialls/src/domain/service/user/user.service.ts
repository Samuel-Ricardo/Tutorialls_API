import { ILoginUserDTO } from 'src/domain/DTO/user/login.dto';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { User } from 'src/domain/entity/user.entity';

export interface IUserService {
  login(user: ILoginUserDTO): Promise<User>;
  signup(user: ISignupUserDTO): Promise<User>;
}
