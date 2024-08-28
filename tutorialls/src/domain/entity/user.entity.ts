import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';
import { IUserDTO } from '../DTO/user/user.dto';

export class User {
  @IsUUID()
  private readonly id: string;
  @IsEmail()
  private readonly email: string;
  @IsString()
  @MinLength(8)
  private readonly password: string;
  private readonly authToken?: string;

  constructor(id: string, email: string, password: string, authToken?: string) {
    this.id = id;
    this.email = email;
    this.password = password;
    this.authToken = authToken;
  }

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
