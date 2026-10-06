export interface ProofProxyObservation {
  method: string;
  path: string;
  outcome: 'forwarded' | 'rejected' | 'offline';
}
export interface ProofProxy {
  origin: string;
  setOffline(value: boolean): Promise<void>;
  snapshot(): ProofProxyObservation[];
  droppedObservationCount(): number;
  close(): Promise<void>;
}
export function startProofProxy(allowedOrigins: string[]): Promise<ProofProxy>;
