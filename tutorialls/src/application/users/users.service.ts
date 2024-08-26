import { Injectable } from '@nestjs/common';
import { IAuthUserDTO } from 'src/domain/DTO/user/auth.dto';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { User } from 'src/domain/entity/user.entity';
import { IAuthService } from 'src/domain/service/user/auth.service';

@Injectable()
export class AuthService implements IAuthService {
  login(user: IAuthUserDTO): Promise<User> {
    throw new Error('Method not implemented.');
  }
  signup(user: ISignupUserDTO): Promise<User> {
    throw new Error('Method not implemented.');
  }
}
