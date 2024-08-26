import { Injectable } from '@nestjs/common';
import { IFindUserByEmailDTO } from 'src/domain/DTO/user/find/by/email.dto';
import { IFindUserByIdDTO } from 'src/domain/DTO/user/find/by/id.dto';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { IUserDTO } from 'src/domain/DTO/user/user.dto';
import { User } from 'src/domain/entity/user.entity';
import { IUserRepository } from 'src/domain/repository/user/user.repository';
import { PrismaService } from 'src/infra/engine/database/prisma/prisma.service';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async signup(user: ISignupUserDTO): Promise<User> {
    return User.fromDTO(
      this.prisma.user.create({ data: user }) as unknown as IUserDTO,
    );
  }

  async findByEmail(DTO: IFindUserByEmailDTO) {
    return User.fromDTO(
      this.prisma.user.findUnique({
        where: { email: DTO.email },
      }) as unknown as IUserDTO,
    );
  }

  findById(DTO: IFindUserByIdDTO): Promise<User> {
    throw new Error('Method not implemented.');
  }
}
