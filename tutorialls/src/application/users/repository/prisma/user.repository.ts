import { Injectable } from '@nestjs/common';
import { IFindUserByEmailDTO } from 'src/domain/DTO/user/find/by/email.dto';
import { IFindUserByIdDTO } from 'src/domain/DTO/user/find/by/id.dto';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { User } from 'src/domain/entity/user.entity';
import { IUserRepository } from 'src/domain/repository/user/user.repository';
import { PrismaService } from 'src/infra/engine/database/prisma/prisma.service';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async signup(user: ISignupUserDTO): Promise<User> {
    const result = await this.prisma.user.create({ data: user });

    return result
      ? User.fromDTO({
          id: result.id,
          email: result.email,
          password: result.password,
          authToken: result.authToken,
        })
      : undefined;
  }

  async findByEmail(DTO: IFindUserByEmailDTO) {
    const result = await this.prisma.user.findUnique({
      where: { email: DTO.email },
    });

    if (!result) return undefined;

    return User.fromDTO({
      id: result.id,
      email: result.email,
      password: result.password,
      authToken: result.authToken,
    });
  }

  findById(DTO: IFindUserByIdDTO): Promise<User> {
    throw new Error(`Method not implemented. ${DTO}`);
  }
}
