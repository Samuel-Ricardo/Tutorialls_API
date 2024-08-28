import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { MODULE } from 'src/app.registry';
import { IEncryptionService } from 'src/domain/service/security/encryption.service';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  constructor(
    @Inject(MODULE.ENCRYPTION.SERVICE.NODE)
    private readonly encryption: IEncryptionService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    console.log({ body: req.body });
    const user = await this.encryption.encryptUser(req.body);

    next(user);
  }
}
