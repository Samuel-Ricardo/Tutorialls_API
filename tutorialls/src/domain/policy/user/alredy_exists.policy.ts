import { IUserAlreadyExistsPolicyDTO } from 'src/domain/DTO/user/policy/alredy_exists.dto';

export interface IUserAlreadyExistsPolicy {
  exexecute(user: IUserAlreadyExistsPolicyDTO): Promise<boolean>;
}
