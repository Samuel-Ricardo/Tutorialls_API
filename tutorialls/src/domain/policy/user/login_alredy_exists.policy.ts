import { User } from 'src/domain/entity/user.entity';
import { IUserAlreadyExistsPolicyDTO } from 'src/domain/DTO/user/policy/alredy_exists.dto';

export interface IUserShouldExistsToAuthPolicy {
  execute(user: IUserAlreadyExistsPolicyDTO): Promise<User | undefined>;
}
