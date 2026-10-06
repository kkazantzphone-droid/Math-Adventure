export interface Observations {
  failures: { path: string; error: string | undefined; phase: string }[];
  responses: { path: string; status: number; phase: string }[];
  consoleErrors: {
    path: string | null;
    text: string;
    source: string;
    phase: string;
  }[];
  pageErrors: string[];
  externalAttempts: string[];
}
export function assertCleanObservations(
  observations: Observations,
  expectations?: { missingPath?: string; offlinePaths?: string[] },
): void;
export function beginEvidence(directory: string): Promise<{
  schema: string;
  synthetic: boolean;
  scope: string;
  result: string;
}>;
export function writeEvidence(directory: string, report: object): Promise<void>;
