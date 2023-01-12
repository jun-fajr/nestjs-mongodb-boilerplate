import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CreateTodoDto } from './dto/create-todo.dto';
import { Todo } from './todo.entity';

@Injectable()
export class TodosRepository extends Repository<Todo> {
  constructor(private dataSource: DataSource) {
    super(Todo, dataSource.createEntityManager());
  }

  async createTodo(createTodoDto: CreateTodoDto): Promise<Todo> {
    const { title, completed } = createTodoDto;
    const todo = this.create({
      title,
      completed,
    });

    try {
      await this.save(todo);
    } catch (err) {
      if (err.code === 11000) {
        throw new ConflictException('Todo name already exists');
      } else {
        throw new InternalServerErrorException();
      }
    }

    return todo;
  }
}
