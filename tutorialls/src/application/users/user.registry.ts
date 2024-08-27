import { USER_POLICY_REGISTRY } from './policy/policy.registry';
import { USER_REPOSITORY_REGISTRY } from './repository/repository.registry';
import { USER_USE_CASE_REGISTRY } from './use_case/use_case.registry';

export const USER_REGISTRY = {
  POLICY: USER_POLICY_REGISTRY,
  USE_CASE: USER_USE_CASE_REGISTRY,
  REPOSITORY: USER_REPOSITORY_REGISTRY,
  SERVICE: {
    AUTH: 'MODULE::USER::SERVICE::AUTH',
  },
};
