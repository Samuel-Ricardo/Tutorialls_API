import { Injectable } from '@nestjs/common';
import { IPaginationOutputDTO } from 'src/domain/DTO/pagination/output.dto';
import { ICreateTutorialDTO } from 'src/domain/DTO/tutorial/create.dto';
import { IDeleteTutorialDTO } from 'src/domain/DTO/tutorial/delete.dto';
import { IFilterTutorialsByAuthorDTO } from 'src/domain/DTO/tutorial/filter/by/author.dto';
import { IFilterTutorialsByContentDTO } from 'src/domain/DTO/tutorial/filter/by/content.dto';
import { IFilterTutorialsByTitleDTO } from 'src/domain/DTO/tutorial/filter/by/title.dto';
import { IListAllTutorialsDTO } from 'src/domain/DTO/tutorial/list/all.dto';
import { IUpdateTutorialDTO } from 'src/domain/DTO/tutorial/update.dto';
import { Tutorial } from 'src/domain/entity/tutorial.entity';
import { ITutorialRepository } from 'src/domain/repository/tutorial/tutorial.repository';
import { PrismaService } from 'src/infra/engine/database/prisma/prisma.service';

@Injectable()
export class PrismaTutorialRepository implements ITutorialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(tutorial: ICreateTutorialDTO) {}
  update(tutorial: IUpdateTutorialDTO): Promise<Tutorial> {
    throw new Error('Method not implemented.');
  }
  delete(tutorial: IDeleteTutorialDTO): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
  listAll(DTO: IListAllTutorialsDTO): Promise<IPaginationOutputDTO<Tutorial>> {
    throw new Error('Method not implemented.');
  }
  findByTitle(
    DTO: IFilterTutorialsByTitleDTO,
  ): Promise<IPaginationOutputDTO<Tutorial>> {
    throw new Error('Method not implemented.');
  }
  findByAuthor(
    DTO: IFilterTutorialsByAuthorDTO,
  ): Promise<IPaginationOutputDTO<Tutorial>> {
    throw new Error('Method not implemented.');
  }
  findByKeywordInContent(
    DTO: IFilterTutorialsByContentDTO,
  ): Promise<IPaginationOutputDTO<Tutorial>> {
    throw new Error('Method not implemented.');
  }
}
