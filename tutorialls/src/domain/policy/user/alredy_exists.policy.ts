import { IUserAlreadyExistsPolicyDTO } from 'src/domain/DTO/user/policy/alredy_exists.dto';

export interface IUserShouldNotAlreadyExistsToSignupPolicy {
  execute(user: IUserAlreadyExistsPolicyDTO): Promise<boolean>;
}
