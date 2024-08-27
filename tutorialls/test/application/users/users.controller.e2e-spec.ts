import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { ISignupUserDTO } from 'src/domain/DTO/user/register.dto';
import { ILoginUserDTO } from 'src/domain/DTO/user/login.dto';

describe('UsersController (e2e)', () => {
  let app;
  let httpServer;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await NestFactory.createApplicationContext(moduleRef);
    httpServer = app.getHttpServer();
  });

  it('/user/signup (POST)', async () => {
    const userDto: ISignupUserDTO = {
      email: 'test@test.com',
      password: '12345',
    };
    await request(httpServer).post('/user/signup').send(userDto).expect(201);
  });

  it('/user/login (POST)', async () => {
    const userDto: ILoginUserDTO = {
      email: 'test@test.com',
      password: '12345',
    };

    await request(httpServer).post('/user/login').send(userDto).expect(500);
  });

  afterAll(async () => {
    await app.close();
  });
});
