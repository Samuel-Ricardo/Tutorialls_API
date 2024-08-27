// src/auth/auth.service.spec.ts

import { JwtAuthService } from './auth.service';
import { IGenerateAuthTokenDTO } from 'src/domain/DTO/auth/token/generate.dto';
import { IValidateAuthTokenDTO } from 'src/domain/DTO/auth/token/validate.dto';
import { IGenerateAuthTokenUseCase } from 'src/domain/use_case/auth/generate_token.use_case';
import { IValidateAuthTokenUseCase } from 'src/domain/use_case/auth/validate_token.use_case';

describe('JwtAuthService', () => {
  let service: JwtAuthService;
  let generateTokenUseCase: IGenerateAuthTokenUseCase;
  let validateTokenUseCase: IValidateAuthTokenUseCase;

  beforeEach(() => {
    generateTokenUseCase = {
      execute: jest.fn(),
    } as unknown as IGenerateAuthTokenUseCase;
    validateTokenUseCase = {
      execute: jest.fn(),
    } as unknown as IValidateAuthTokenUseCase;

    service = new JwtAuthService(generateTokenUseCase, validateTokenUseCase);
  });

  describe('authenticate', () => {
    it('should return a token when execute is called', async () => {
      const dto: IGenerateAuthTokenDTO = {
        email: 'mockEmail',
        password: 'mockPassword',
      };
      const token = 'mockToken';

      (generateTokenUseCase.execute as jest.Mock).mockResolvedValue(token);

      const result = await service.authenticate(dto);
      expect(result).toBe(token);
      expect(generateTokenUseCase.execute).toHaveBeenCalledWith(dto);
    });
  });

  describe('validate', () => {
    it('should return true when token is valid', async () => {
      const dto: IValidateAuthTokenDTO = {
        token: 'mockToken',
      };
      const isValid = true;

      (validateTokenUseCase.execute as jest.Mock).mockResolvedValue(isValid);

      const result = await service.validate(dto);
      expect(result).toBe(isValid);
      expect(validateTokenUseCase.execute).toHaveBeenCalledWith(dto);
    });
  });
});
