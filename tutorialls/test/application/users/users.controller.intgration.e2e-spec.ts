import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { ExceptionFilter } from 'src/exception.filter';
import { HttpAdapterHost } from '@nestjs/core';

describe('UsersController (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    //  app.useGlobalPipes(new ValidationPipe());
    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(new ExceptionFilter(httpAdapter));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/user/signup (POST)', () => {
    it('should return 201 after successful signup', async () => {
      const userMock = {
        email: 'test@test.com',
        password: '12345',
      };

      return request(app.getHttpServer())
        .post('/user/signup')
        .send(userMock)
        .expect(201);
    });

    it('should return 400 if input data is invalid', async () => {
      const invalidUserMock = {
        email: 'invalid-email',
        password: '123',
      };

      return request(app.getHttpServer())
        .post('/user/signup')
        .send(invalidUserMock)
        .expect(400);
    });
  });

  describe('/user/login (POST)', () => {
    it('should return 200 with a token after successful login', async () => {
      const userMock = {
        email: 'test@test.com',
        password: '12345',
      };

      const response = await request(app.getHttpServer())
        .post('/user/login')
        .send(userMock)
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });

    it('should return 401 for invalid credentials', async () => {
      const invalidUserMock = {
        email: 'wrong@test.com',
        password: 'wrongpassword',
      };

      return request(app.getHttpServer())
        .post('/user/login')
        .send(invalidUserMock)
        .expect(401);
    });
  });
});
