import { Injectable } from '@nestjs/common';
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

  async create(tutorial: ICreateTutorialDTO) {
    const result = await this.prisma.tutorial.create({
      data: { ...tutorial },
    });

    return Tutorial.fromDTO(result);
  }
  async update(tutorial: IUpdateTutorialDTO) {
    const result = await this.prisma.tutorial.update({
      where: { id: tutorial.id },
      data: {
        author: tutorial.author,
        title: tutorial.title,
        content: tutorial.content,
      },
    });

    return Tutorial.fromDTO(result);
  }

  async delete(tutorial: IDeleteTutorialDTO) {
    const result = await this.prisma.tutorial.delete({
      where: { id: tutorial.id },
    });

    return !!result;
  }

  async listAll({ pagination: { limit, page } }: IListAllTutorialsDTO) {
    const result = await this.prisma.tutorial.findMany({
      skip: (page - 1) * limit,
      take: Number(limit),
    });

    return {
      items: result.map((tutorial) => Tutorial.fromDTO(tutorial)),
      total: await this.prisma.tutorial.count(),
      limit,
      page,
    };
  }
  async findByTitle({ limit, page, title }: IFilterTutorialsByTitleDTO) {
    const result = await this.prisma.tutorial.findMany({
      skip: (page - 1) * limit,
      take: Number(limit),
      where: { title: { contains: title } },
    });

    return {
      items: result.map((tutorial) => Tutorial.fromDTO(tutorial)),
      total: await this.prisma.tutorial.count(),
      limit,
      page,
    };
  }

  async findByAuthor({ author, limit, page }: IFilterTutorialsByAuthorDTO) {
    const result = await this.prisma.tutorial.findMany({
      skip: (page - 1) * limit,
      take: Number(limit),
      where: { author: { contains: author } },
    });

    return {
      items: result.map(Tutorial.fromDTO),
      total: await this.prisma.tutorial.count(),
      limit,
      page,
    };
  }

  async findByKeywordInContent({
    keyword,
    limit,
    page,
  }: IFilterTutorialsByContentDTO) {
    const result = await this.prisma.tutorial.findMany({
      skip: (page - 1) * limit,
      take: Number(limit),
      where: { content: { contains: keyword } },
    });

    return {
      items: result.map(Tutorial.fromDTO),
      total: await this.prisma.tutorial.count(),
      limit,
      page,
    };
  }
}
