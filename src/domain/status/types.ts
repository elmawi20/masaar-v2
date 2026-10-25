/**
 * Masaar Clinic System — Core Status Machine Types
 * 
 * Design Task 1.06: Strictly typed data structures for domain state machines.
 * Pure data and types only. No runtime application logic or database queries.
 */

import type { ClinicRole } from '../permissions';

export interface StatusDefinition<TStatus extends string> {
  readonly status: TStatus;
  readonly labelEn: string;
  readonly labelAr: string;
  readonly descriptionEn: string;
  readonly descriptionAr: string;
  readonly isTerminal?: boolean;
}

export interface StateTransition<TStatus extends string> {
  readonly id: string;
  readonly from: TStatus;
  readonly to: TStatus;
  readonly allowedRoles: readonly ClinicRole[];
  readonly requiresReason: boolean;
  readonly reasonOptions?: readonly string[];
  readonly timeLimit?: string;
  readonly conditions?: string;
  readonly sideEffects: readonly string[];
  readonly ruleIds: readonly string[];
  readonly descriptionEn: string;
  readonly descriptionAr: string;
}

export interface ForbiddenTransition<TStatus extends string> {
  readonly from: TStatus;
  readonly to: TStatus;
  readonly reasonEn: string;
  readonly reasonAr: string;
  readonly ruleIds: readonly string[];
}

export interface StatusMachineDefinition<TStatus extends string> {
  readonly entityName: string;
  readonly initialStatus: TStatus;
  readonly statuses: readonly StatusDefinition<TStatus>[];
  readonly transitions: readonly StateTransition<TStatus>[];
  readonly forbiddenTransitions: readonly ForbiddenTransition<TStatus>[];
}
