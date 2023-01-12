import { IsMongoId } from 'class-validator';

export class GetTodoDto {
  @IsMongoId()
  id: string;
}
