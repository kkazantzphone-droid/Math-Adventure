/** Browser capability facts only; this port owns no mathematical or learner state. */
export interface OfflineSnapshot {
  readonly shell: 'checking' | 'ready' | 'unavailable' | 'unsupported';
  readonly update: 'none' | 'waiting' | 'preparing' | 'blocked' | 'recovering';
  readonly frozen: boolean;
  readonly safeBoundary: boolean;
  readonly releaseId: string | null;
}

export interface OfflineController {
  snapshot(): OfflineSnapshot;
  subscribe(listener: () => void): () => void;
  start(): Promise<void>;
  setSafeBoundary(safe: boolean): void;
  canInteract(): boolean;
  requestUpdate(): Promise<void>;
  dispose(): void;
}
