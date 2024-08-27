import { Test, TestingModule } from '@nestjs/testing';
import { NodeEncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: NodeEncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NodeEncryptionService],
    }).compile();

    service = module.get<NodeEncryptionService>(NodeEncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
