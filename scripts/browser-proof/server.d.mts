export interface ProofRequestObservation {
  method: string;
  path: string;
  status: number;
}

export interface ProofServer {
  origin: string;
  requestCount(): number;
  droppedObservationCount(): number;
  requestSnapshot(): ProofRequestObservation[];
  setFixtureVersion(version: 'v1' | 'v2'): void;
  setProductionRelease(prefix: '/' | '/math-adventure/', name: string): void;
  setFailedAsset(path: string | null): void;
  close(): Promise<void>;
}

export function startProofServer(options: {
  distDirectory: string;
  fixtureDirectory: string;
  productionReleases?: {
    name: string;
    prefix: '/' | '/math-adventure/';
    directory: string;
  }[];
}): Promise<ProofServer>;
