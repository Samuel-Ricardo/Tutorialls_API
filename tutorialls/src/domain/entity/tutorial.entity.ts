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
  private readonly creator: string;
  @IsDate()
  private readonly created_at?: Date;
  @IsDate()
  private readonly updated_at?: Date;

  constructor(
    id: string,
    title: string,
    content: string,
    creator: string,
    created_at?: Date,
    updated_at?: Date,
  ) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.creator = creator;
  }

  toDTO(): ITutorialDTO {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      creator: this.creator,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  static fromDTO(dto: ITutorialDTO): Tutorial {
    return new Tutorial(
      dto.id,
      dto.title,
      dto.content,
      dto.creator,
      dto.created_at,
      dto.updated_at,
    );
  }
}
