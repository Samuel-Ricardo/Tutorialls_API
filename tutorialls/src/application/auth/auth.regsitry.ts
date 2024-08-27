import { AUTH_USE_CASE_REGISTRY } from './use_case/auth.registry';

export const AUTH_REGISTRY = {
  USE_CASE: AUTH_USE_CASE_REGISTRY,
  SERVICE: {
    JWT: 'MODULE::AUTH::SERVICE::JWT',
  },
};
