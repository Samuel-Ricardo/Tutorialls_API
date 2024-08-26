import { IUserDTO } from '../DTO/user/user.dto';

export class User {
  constructor(
    private readonly id: string,
    private readonly email: string,
    private readonly password: string,
    private readonly authToken?: string,
  ) {}

  toDTO(): IUserDTO {
    return {
      id: this.id,
      email: this.email,
      password: this.password,
      authToken: this.authToken,
    };
  }

  static fromDTO(dto: IUserDTO): User {
    return new User(dto.id, dto.email, dto.password, dto.authToken);
  }
}
