import { PlasmaVault } from '../PlasmaVault';
import { ERC20_SUBSTRATES_ONLY_TRACKED_ASSETS } from './rules/erc20-substrates-only-tracked-assets';
import { MORPHO_MARKETS_WITHOUT_PRICE_FEED } from './rules/morpho-markets-without-price-feed';
import { ERC20_VAULT_BALANCE_DEPENDENCY_MISSING } from './rules/erc20-vault-balance-dependency';
import { BALANCE_FUSES_MISSING } from './rules/balance-fuses-missing';
import { INSTANT_WITHDRAW_ORDER_INVALID } from './rules/instant-withdraw-order-invalid';

export const SETUP_RULE_IDS = [
  'ERC20_SUBSTRATES_ONLY_TRACKED_ASSETS',
  'MORPHO_MARKETS_WITHOUT_PRICE_FEED',
  'ERC20_VAULT_BALANCE_DEPENDENCY_MISSING',
  'BALANCE_FUSES_MISSING',
  'INSTANT_WITHDRAW_ORDER_INVALID',
] as const;

export type ValidationRuleId = (typeof SETUP_RULE_IDS)[number];

export interface SetupRuleValidationResult<TValue> {
  ruleId: ValidationRuleId;
  value:
    | {
        status: 'ok';
        message: string;
      }
    | {
        status: 'info';
        message: string;
        violations: TValue;
      }
    | {
        status: 'warning';
        message: string;
        violations: TValue;
      }
    | {
        status: 'error';
        message: string;
        violations: TValue;
      }
    | {
        status: 'not-applicable';
      };
}

export interface SetupRule<TValue> {
  id: string;
  title: string;
  description: string;
  validate: (
    plasmaVault: PlasmaVault,
  ) => Promise<SetupRuleValidationResult<TValue>>;
}

export const SETUP_RULE = {
  ERC20_SUBSTRATES_ONLY_TRACKED_ASSETS,
  MORPHO_MARKETS_WITHOUT_PRICE_FEED,
  ERC20_VAULT_BALANCE_DEPENDENCY_MISSING,
  BALANCE_FUSES_MISSING,
  INSTANT_WITHDRAW_ORDER_INVALID,
} as const satisfies Record<ValidationRuleId, SetupRule<unknown>>;

export type GetValidationResult<TId extends ValidationRuleId> =
  (typeof SETUP_RULE)[TId]['validate'] extends (
    plasmaVault: PlasmaVault,
  ) => Promise<SetupRuleValidationResult<infer TValue>>
    ? TValue
    : never;

export type SetupRuleValidationStatus =
  SetupRuleValidationResult<unknown>['value']['status'];
