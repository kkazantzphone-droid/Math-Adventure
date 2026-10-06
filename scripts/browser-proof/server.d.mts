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
  close(): Promise<void>;
}

export function startProofServer(options: {
  distDirectory: string;
  fixtureDirectory: string;
}): Promise<ProofServer>;
