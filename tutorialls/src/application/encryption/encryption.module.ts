import { Module } from '@nestjs/common';
import { NodeEncryptionService } from './encryption.service';
import { MODULE } from 'src/app.registry';
import { NodeEncryptUserUseCase } from './use_case/user/encrypt.use_case';
import { NodeDecryptUserUseCase } from './use_case/user/decrypt.use_case';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MODULE.ENCRYPTION.SERVICE.NODE,
      useClass: NodeEncryptionService,
    },
    {
      provide: MODULE.ENCRYPTION.USE_CASE.USER.ENCRYPT,
      useClass: NodeEncryptUserUseCase,
    },
    {
      provide: MODULE.ENCRYPTION.USE_CASE.USER.DECRYPT,
      useClass: NodeDecryptUserUseCase,
    },
  ],
  exports: [
    {
      provide: MODULE.ENCRYPTION.SERVICE.NODE,
      useClass: NodeEncryptionService,
    },
  ],
})
export class EncryptionModule {}
