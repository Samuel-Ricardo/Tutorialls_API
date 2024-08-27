import { ILoginOutputDTO } from 'src/domain/DTO/output/user/login.dto';
import { ILoginUserDTO } from 'src/domain/DTO/user/login.dto';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';

export interface IUserService {
  login(user: ILoginUserDTO): Promise<ILoginOutputDTO>;
  signup(user: ISignupUserDTO): Promise<void>;
}
