import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { IFindUserByEmailDTO } from 'src/domain/DTO/user/find/by/email.dto';
import { IFindUserByIdDTO } from 'src/domain/DTO/user/find/by/id.dto';
import { User } from 'src/domain/entity/user.entity';

export interface IUserRepository {
  register(user: ISignupUserDTO): Promise<User>;
  findByEmail(DTO: IFindUserByEmailDTO): Promise<User>;
  findById(DTO: IFindUserByIdDTO): Promise<User>;
}
