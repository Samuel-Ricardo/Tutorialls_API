import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvService {
  constructor(private readonly config: ConfigService) {}

  static get ENV() {
    const config = new ConfigService();
    return {
      DATABASE: {
        URL: config.get<string>('DATABASE_URL'),
      },
      JWT: {
        SECRET: config.get<string>('JWT_SECRET'),
        EXPIRES_IN: config.get<string>('JWT_EXPIRES_IN'),
      },
      ENCRYPT: {
        ALGORITHM: config.get<string>('ENCRYPT_ALGORITHM'),
        KEY: config.get<string>('ENCRYPT_KEY'),
        BREAKPOINT: config.get<string>('ENCRYPT_BREAKPOINT'),
      },
      HASH: {
        ROUNDS: config.get<number>('HASH_ROUNDS'),
      },
      REDIS: {
        HOST: config.get<string>('REDIS_HOST'),
        PORT: config.get<number>('REDIS_PORT'),
        TTL: config.get<number>('CACHE_TTL'),
      },
    };
  }

  getRedisHost() {
    return this.config.get<string>('REDIS_HOST');
  }

  getRedisPort() {
    return this.config.get<number>('REDIS_PORT');
  }

  getCacheTTL() {
    return this.config.get<number>('CACHE_TTL');
  }

  getDatabaseUrl() {
    return this.config.get<string>('DATABASE_URL');
  }

  getJwtSecret() {
    return this.config.get<string>('JWT_SECRET');
  }

  getJwtExpiresIn() {
    return this.config.get<string>('JWT_EXPIRES_IN');
  }

  getEncryptAlgorithm() {
    return this.config.get<string>('ENCRYPT_ALGORITHM');
  }

  getEncryptKey() {
    return this.config.get<string>('ENCRYPT_KEY');
  }

  getCipherBreakpoint() {
    return this.config.get<string>('ENCRYPT_BREAKPOINT');
  }

  getHashRounds() {
    return this.config.get<number>('HASH_ROUNDS');
  }
}
