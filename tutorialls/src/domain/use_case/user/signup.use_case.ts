import { User } from 'src/domain/entity/user.entity';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';

export interface ISignupUserUseCase {
  execute(user: ISignupUserDTO): Promise<User>;
}
