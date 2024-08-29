import { AUTH_REGISTRY } from './application/auth/auth.regsitry';
import { ENCRYTION_REGISTRY } from './application/encryption/encryption.registry';
import { TUTORIAL_REGISTRY } from './application/tutorial/tutorial.registry';
import { USER_REGISTRY } from './application/users/user.registry';

export const MODULE = {
  USER: USER_REGISTRY,
  AUTH: AUTH_REGISTRY,
  ENCRYPTION: ENCRYTION_REGISTRY,
  TUTORIAL: TUTORIAL_REGISTRY,
};
