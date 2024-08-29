import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';

import { PaginationDTO } from 'src/domain/DTO/pagination.dto';
import { ICreateTutorialDTO } from 'src/domain/DTO/tutorial/create.dto';
import { IFilterTutorialsByAuthorDTO } from 'src/domain/DTO/tutorial/filter/by/author.dto';
import { IFilterTutorialsByContentDTO } from 'src/domain/DTO/tutorial/filter/by/content.dto';
import { IFilterTutorialsByTitleDTO } from 'src/domain/DTO/tutorial/filter/by/title.dto';
import { IUpdateTutorialDTO } from 'src/domain/DTO/tutorial/update.dto';
import { ITutorialService } from 'src/domain/service/tutorial/tutorial.service';

@Controller('tutorial')
export class TutorialController {
  constructor(private readonly service: ITutorialService) {}

  @Post('')
  create(@Body() user: ICreateTutorialDTO) {
    return this.service.create(user);
  }

  @Get()
  listAll(@Query() pagination: PaginationDTO) {
    return this.service.listAll({ pagination });
  }

  @Get('/title')
  filterByTitle(@Query() DTO: IFilterTutorialsByTitleDTO) {
    return this.service.filterByTitle(DTO);
  }

  @Get('/author')
  filterByAuthor(@Query() DTO: IFilterTutorialsByAuthorDTO) {
    return this.service.filterByAuthor(DTO);
  }

  @Get('/content')
  filterByKeywordInContent(@Query() DTO: IFilterTutorialsByContentDTO) {
    return this.service.filterByKeywordInContent(DTO);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() DTO: IUpdateTutorialDTO) {
    return this.service.update({ ...DTO, id: id });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.delete({ id: id });
  }
}
