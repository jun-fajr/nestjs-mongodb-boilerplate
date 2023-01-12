import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { ObjectId } from 'mongodb';
import { faker } from '@faker-js/faker';
import { clearRepositories, createNestApplication } from '../test-helpers';
import { TodosRepository } from './todos.repository';
import { Todo } from './todo.entity';

describe('Todos', () => {
  let app: INestApplication;
  let dbConnection: DataSource;
  let todosRepository: TodosRepository;
  const createTodoBody = () => {
    return {
      title: faker.word.noun(),
      completed: faker.datatype.boolean(),
    };
  };
  const createInvalidTodoBodies = () => {
    const validTodo = createTodoBody();

    return [
      // invalid payload
      undefined,
      {},

      // invalid name
      { title: undefined, completed: validTodo.completed },
      { title: null, completed: validTodo.completed },
      { title: faker.datatype.boolean(), completed: validTodo.completed },
      { title: faker.datatype.number(), completed: validTodo.completed },
      {
        title: JSON.parse(faker.datatype.json()),
        completed: validTodo.completed,
      },
      { title: '', completed: validTodo.completed },

      // invalid completed
      { title: validTodo.title, completed: undefined },
      { title: validTodo.title, completed: null },
      { title: validTodo.title, completed: faker.datatype.boolean() },
      { title: validTodo.title, completed: faker.datatype.number() },
      { title: validTodo.title, completed: JSON.parse(faker.datatype.json()) },
      { title: validTodo.title, completed: '' },
      { title: validTodo.title, completed: faker.word.noun() },
    ];
  };
  const createTodoItem = async () => {
    const todoBody = createTodoBody();

    return todosRepository.createTodo(todoBody);
  };
  const createInvalidTodoIds = () => {
    return [faker.datatype.uuid(), faker.datatype.number(), faker.word.noun()];
  };

  beforeAll(async () => {
    app = await createNestApplication({
      onBeforeInit: (moduleRef) => {
        dbConnection = moduleRef.get(DataSource);
        todosRepository = moduleRef.get(TodosRepository);
      },
    });
  });

  beforeEach(async () => {
    await clearRepositories(dbConnection);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/todos (GET)', () => {
    it('should handle without data', async () => {
      const res = await request(app.getHttpServer()).get('/todos');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should handle with data', async () => {
      const todos: Array<Todo> = [];
      const todosCount = 3;

      for (let i = 0; i < todosCount; i++) {
        todos.push(await createTodoItem());
      }

      const res = await request(app.getHttpServer()).get('/todos');
      const resBody = res.body;

      expect(res.status).toBe(200);
      expect(resBody).toEqual(JSON.parse(JSON.stringify(todos)));
    });
  });

  describe('/todos (POST)', () => {
    it('should NOT accept invalid data', async () => {
      const invalidData = createInvalidTodoBodies();
      const promises: Array<Promise<void>> = [];

      invalidData.forEach((payload) => {
        promises.push(
          (async () => {
            const res = await request(app.getHttpServer())
              .post('/todos')
              .send(payload);
            const resBody = res.body;

            expect(res.status).toBe(400);
            expect(resBody.error).toBe('Bad Request');
            expect(resBody.message).toEqual(
              expect.arrayContaining([expect.any(String)]),
            );
          })(),
        );
      });

      await Promise.all(promises);
    });

    it('should accept valid data', async () => {
      const todoBody = createTodoBody();

      const res = await request(app.getHttpServer())
        .post('/todos')
        .send(todoBody);
      const resBody = res.body;

      expect(res.status).toBe(201);
      expect(resBody).toEqual({
        ...todoBody,
        id: expect.any(String),
      });

      const todoId = resBody.id;
      const todo = await todosRepository.findOne({
        where: { id: new ObjectId(todoId) } as Partial<Todo>,
      });

      expect(resBody).toEqual(JSON.parse(JSON.stringify(todo)));
    });

    it('should handle already exists', async () => {
      const existingTodo = await createTodoItem();
      const todoBody = createTodoBody();

      const res = await request(app.getHttpServer()).post('/todos').send({
        title: existingTodo.title,
        completed: todoBody.completed,
      });
      const resBody = res.body;

      expect(res.status).toBe(409);
      expect(resBody.error).toBe('Conflict');
      expect(resBody.message).toBe('Short name already exists');
    });

    it('should handle unexpected error', async () => {
      const todosRepositorySaveMock = jest
        .spyOn(todosRepository, 'save')
        .mockRejectedValue({});

      const todoBody = createTodoBody();

      const res = await request(app.getHttpServer())
        .post('/todos')
        .send(todoBody);
      const resBody = res.body;

      expect(res.status).toBe(500);
      expect(resBody.message).toBe('Internal Server Error');

      todosRepositorySaveMock.mockRestore();
    });
  });

  describe('/todos/:id (DELETE)', () => {
    it('should NOT accept invalid id', async () => {
      const invalidData = createInvalidTodoIds();
      const promises: Array<Promise<void>> = [];

      invalidData.forEach((todoId) => {
        promises.push(
          (async () => {
            const res = await request(app.getHttpServer()).delete(
              `/todos/${todoId}`,
            );
            const resBody = res.body;

            expect(res.status).toBe(400);
            expect(resBody.error).toBe('Bad Request');
            expect(resBody.message).toEqual(
              expect.arrayContaining([expect.any(String)]),
            );
          })(),
        );
      });

      await Promise.all(promises);
    });

    it('should handle not found', async () => {
      const todoId = faker.database.mongodbObjectId();
      const res = await request(app.getHttpServer()).delete(`/todos/${todoId}`);
      const resBody = res.body;

      expect(res.status).toBe(404);
      expect(resBody.error).toBe('Not Found');
      expect(resBody.message).toBe(`Todo with ID: "${todoId}" not found`);
    });

    it('should handle delete', async () => {
      const todo = await createTodoItem();
      const todoId = todo.id;

      const res = await request(app.getHttpServer()).delete(`/todos/${todoId}`);

      expect(res.status).toBe(200);

      const deletedTodo = await todosRepository.findOne({
        where: { _id: todoId } as Partial<Todo>,
      });

      expect(deletedTodo).toBeNull();
    });
  });

  describe('/todos/:id (PUT)', () => {
    it('should NOT accept invalid id', async () => {
      const invalidData = createInvalidTodoIds();
      const promises: Array<Promise<void>> = [];

      invalidData.forEach((todoId) => {
        promises.push(
          (async () => {
            const res = await request(app.getHttpServer()).put(
              `/todos/${todoId}`,
            );
            const resBody = res.body;

            expect(res.status).toBe(400);
            expect(resBody.error).toBe('Bad Request');
            expect(resBody.message).toEqual(
              expect.arrayContaining([expect.any(String)]),
            );
          })(),
        );
      });

      await Promise.all(promises);
    });

    it('should NOT accept invalid data', async () => {
      const todoId = faker.datatype.uuid();
      const invalidData = createInvalidTodoBodies();
      const promises: Array<Promise<void>> = [];

      invalidData.forEach((payload) => {
        promises.push(
          (async () => {
            const res = await request(app.getHttpServer())
              .put(`/todos/${todoId}`)
              .send(payload);
            const resBody = res.body;

            expect(res.status).toBe(400);
            expect(resBody.error).toBe('Bad Request');
            expect(resBody.message).toEqual(
              expect.arrayContaining([expect.any(String)]),
            );
          })(),
        );
      });

      await Promise.all(promises);
    });

    it('should handle not found', async () => {
      const todoId = faker.database.mongodbObjectId();
      const todoBody = createTodoBody();
      const res = await request(app.getHttpServer())
        .put(`/todos/${todoId}`)
        .send(todoBody);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Not Found');
    });
  });
});
