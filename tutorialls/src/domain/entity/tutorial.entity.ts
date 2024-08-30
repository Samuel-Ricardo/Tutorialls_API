import {
  IsDate,
  IsNotEmpty,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ITutorialDTO } from '../DTO/tutorial/tutorial.dto';

export class Tutorial {
  @IsUUID()
  private readonly id: string;
  @IsString()
  @MinLength(3)
  private readonly title: string;
  @IsString()
  @IsNotEmpty()
  private readonly content: string;
  @IsString()
  @IsNotEmpty()
  private readonly autor: string;
  @IsDate()
  private readonly created_at?: Date;
  @IsDate()
  private readonly updated_at?: Date;

  constructor(
    id: string,
    title: string,
    content: string,
    autor: string,
    created_at?: Date,
    updated_at?: Date,
  ) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.autor = autor;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  toDTO(): ITutorialDTO {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      author: this.autor,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  static fromDTO(dto: ITutorialDTO): Tutorial {
    return new Tutorial(
      dto.id,
      dto.title,
      dto.content,
      dto.author,
      dto.created_at,
      dto.updated_at,
    );
  }
}
