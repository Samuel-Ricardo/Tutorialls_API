import { IUserPasswordIsValidDTO } from 'src/domain/DTO/user/policy/password_is_valid.dto';

export interface IPasswordShouldBeValidToLogin {
  execute(user: IUserPasswordIsValidDTO): Promise<boolean>;
}
