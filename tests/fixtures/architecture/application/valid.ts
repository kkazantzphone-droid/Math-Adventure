import type { DomainResult } from '../../../../src/domain/core/result';
import type { AtomicRecordRepository } from '../../../../src/application/ports/repository';

export type DomainRepository = AtomicRecordRepository<DomainResult<number>>;

export function usePort(
  port: DomainRepository,
): ReturnType<DomainRepository['getEpoch']> {
  return port.getEpoch();
}

export const pending: Promise<number> = Promise.resolve(1);
export const values: ReadonlyMap<string, number> = new Map([['synthetic', 1]]);
