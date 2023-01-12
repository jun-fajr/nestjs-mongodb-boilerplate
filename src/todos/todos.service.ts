import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from './todo.entity';
import { ObjectId } from 'mongodb';
import { FindOneOptions } from 'typeorm';
import { CreateTodoDto } from './dto/create-todo.dto';
import { GetTodoDto } from './dto/get-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { TodosRepository } from './todos.repository';

@Injectable()
export class TodosService {
  constructor(private readonly todosRepository: TodosRepository) {
    this.todosRepository = todosRepository;
  }

  async getAllTodos(): Promise<Array<Todo>> {
    return this.todosRepository.find({});
  }

  async createTodo(createTodoDto: CreateTodoDto): Promise<Todo> {
    return this.todosRepository.createTodo(createTodoDto);
  }

  async getTodo(conditions: FindOneOptions<Todo>) {
    const todo = await this.todosRepository.findOne(conditions);

    if (!todo) {
      throw new NotFoundException();
    }

    return todo;
  }

  async deleteTodo(getTodoDto: GetTodoDto): Promise<void> {
    const { id } = getTodoDto;
    const res = await this.todosRepository.delete(id);

    if (res.affected === 0) {
      throw new NotFoundException(`Todo with ID: "${id}" not found`);
    }
  }

  async updateTodo(
    getTodoDto: GetTodoDto,
    updateTodoDto: UpdateTodoDto,
  ): Promise<Todo> {
    const { id } = getTodoDto;
    const todo = await this.getTodo({
      where: { id: new ObjectId(id) } as Partial<Todo>,
    });
    const { title, completed } = updateTodoDto;

    todo.title = title;
    todo.completed = completed;

    await this.todosRepository.save(todo);

    return todo;
  }
}
