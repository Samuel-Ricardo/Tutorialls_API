import { ENCRYPTION_USE_CASE_REGISTRY } from './use_case/user/encryption.registry';

export const ENCRYTION_REGISTRY = {
  SERVICE: {
    NODE: 'MODULE::ENCRYPTION::SERVICE::NODE',
  },
  USE_CASE: ENCRYPTION_USE_CASE_REGISTRY,
};
