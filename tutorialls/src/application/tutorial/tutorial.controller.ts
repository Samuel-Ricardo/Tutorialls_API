import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { MODULE } from 'src/app.registry';

import { PaginationDTO } from 'src/domain/DTO/pagination.dto';
import { ICreateTutorialDTO } from 'src/domain/DTO/tutorial/create.dto';
import { IFilterTutorialsByAuthorDTO } from 'src/domain/DTO/tutorial/filter/by/author.dto';
import { IFilterTutorialsByContentDTO } from 'src/domain/DTO/tutorial/filter/by/content.dto';
import { IFilterTutorialsByTitleDTO } from 'src/domain/DTO/tutorial/filter/by/title.dto';
import { IUpdateTutorialDTO } from 'src/domain/DTO/tutorial/update.dto';
import { ITutorialService } from 'src/domain/service/tutorial/tutorial.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@Controller('tutorial')
export class TutorialController {
  constructor(
    @Inject(MODULE.TUTORIAL.SERVICE.MAIN)
    private readonly service: ITutorialService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('')
  async create(@Body() user: ICreateTutorialDTO) {
    return await this.service.create(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async listAll(@Query() pagination: PaginationDTO) {
    return await this.service.listAll({ pagination });
  }

  @UseGuards(JwtAuthGuard)
  @Get('/title')
  async filterByTitle(@Query() DTO: IFilterTutorialsByTitleDTO) {
    return await this.service.filterByTitle(DTO);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/author')
  async filterByAuthor(@Query() DTO: IFilterTutorialsByAuthorDTO) {
    return await this.service.filterByAuthor(DTO);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/content')
  async filterByKeywordInContent(@Query() DTO: IFilterTutorialsByContentDTO) {
    return await this.service.filterByKeywordInContent(DTO);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() DTO: IUpdateTutorialDTO) {
    return await this.service.update({ ...DTO, id: id });
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.service.delete({ id: id });
  }
}
