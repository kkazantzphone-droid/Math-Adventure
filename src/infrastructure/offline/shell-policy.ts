export const SHELL_PROTOCOL_VERSION = 1 as const;
export const MAX_REQUIRED_CLIENTS = 16;
export const UPDATE_ACK_TIMEOUT_MS = 5000;

export interface EssentialResource {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
}

export interface ShellRelease {
  readonly protocolVersion: 1;
  readonly releaseId: string;
  readonly shellId: string;
  readonly schemaVersion: 1;
  readonly compatibleSchema: { readonly min: 1; readonly max: 1 };
  readonly prototypeLocales: readonly ['el-GR', 'en-GB', 'de-DE'];
  readonly essential: readonly EssentialResource[];
}

export interface ShellStatus {
  readonly type: 'STATUS';
  readonly protocolVersion: 1;
  readonly releaseId: string;
  readonly shellId: string;
  readonly schemaVersion: 1;
  readonly compatibleSchema: { readonly min: 1; readonly max: 1 };
  readonly ready: boolean;
  readonly updateInProgress: boolean;
  readonly cacheName: string;
  readonly metadataCacheName: string;
  readonly metadataURL: string;
  readonly essentialURLs: readonly string[];
}

export interface ShellOwnership {
  readonly protocolVersion: 1;
  readonly schemaVersion: 1;
  readonly releaseId: string;
  readonly priorReleaseIds: readonly string[];
}

export function parseShellOwnership(
  value: unknown,
  releaseId: string,
): ShellOwnership | null {
  if (
    !record(value) ||
    !exactKeys(value, [
      'protocolVersion',
      'schemaVersion',
      'releaseId',
      'priorReleaseIds',
    ]) ||
    value.protocolVersion !== 1 ||
    value.schemaVersion !== 1 ||
    value.releaseId !== releaseId ||
    !Array.isArray(value.priorReleaseIds) ||
    value.priorReleaseIds.length > 64
  )
    return null;
  let previous = '';
  const priorReleaseIds: string[] = [];
  for (const id of value.priorReleaseIds) {
    if (
      typeof id !== 'string' ||
      !/^sha256-[a-f0-9]{64}$/.test(id) ||
      id === releaseId ||
      id <= previous
    )
      return null;
    previous = id;
    priorReleaseIds.push(id);
  }
  return Object.freeze({
    protocolVersion: 1,
    schemaVersion: 1,
    releaseId,
    priorReleaseIds: Object.freeze(priorReleaseIds),
  });
}

export type ActivationBlockCode =
  | 'unready'
  | 'timeout'
  | 'clients-changed'
  | 'busy'
  | 'cache-incomplete'
  | 'invalid-source';

export interface ActivationResult {
  readonly type: 'ACTIVATION_RESULT';
  readonly protocolVersion: 1;
  readonly releaseId: string;
  readonly outcome: 'activating' | 'blocked';
  readonly code?: ActivationBlockCode;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

export function parseShellRelease(value: unknown): ShellRelease {
  if (
    !record(value) ||
    !exactKeys(value, [
      'protocolVersion',
      'releaseId',
      'shellId',
      'schemaVersion',
      'compatibleSchema',
      'prototypeLocales',
      'essential',
    ]) ||
    value.protocolVersion !== 1 ||
    value.schemaVersion !== 1 ||
    typeof value.releaseId !== 'string' ||
    !/^sha256-[a-f0-9]{64}$/.test(value.releaseId) ||
    typeof value.shellId !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.shellId) ||
    !record(value.compatibleSchema) ||
    !exactKeys(value.compatibleSchema, ['min', 'max']) ||
    value.compatibleSchema.min !== 1 ||
    value.compatibleSchema.max !== 1 ||
    !Array.isArray(value.prototypeLocales) ||
    JSON.stringify(value.prototypeLocales) !==
      JSON.stringify(['el-GR', 'en-GB', 'de-DE']) ||
    !Array.isArray(value.essential) ||
    value.essential.length < 1 ||
    value.essential.length > 64
  ) {
    throw new Error('INVALID_SHELL_RELEASE');
  }
  let previous = '';
  let totalBytes = 0;
  const essential: EssentialResource[] = [];
  for (const entry of value.essential) {
    if (
      !record(entry) ||
      !exactKeys(entry, ['path', 'sha256', 'bytes']) ||
      typeof entry.path !== 'string' ||
      entry.path.length > 160 ||
      !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(entry.path) ||
      entry.path
        .split('/')
        .some((part) => part === '.' || part === '..' || !part) ||
      entry.path === 'sw.js' ||
      entry.path === 'release.json' ||
      entry.path <= previous ||
      typeof entry.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      typeof entry.bytes !== 'number' ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes <= 0 ||
      entry.bytes > 10 * 1024 * 1024
    ) {
      throw new Error('INVALID_SHELL_RESOURCE');
    }
    previous = entry.path;
    totalBytes += entry.bytes;
    essential.push(
      Object.freeze({
        path: entry.path,
        sha256: entry.sha256,
        bytes: entry.bytes,
      }),
    );
  }
  if (
    totalBytes > 16 * 1024 * 1024 ||
    !essential.some((entry) => entry.path === 'index.html')
  ) {
    throw new Error('INCOMPLETE_SHELL_RELEASE');
  }
  return Object.freeze({
    protocolVersion: 1,
    releaseId: value.releaseId,
    shellId: value.shellId,
    schemaVersion: 1,
    compatibleSchema: Object.freeze({ min: 1, max: 1 }),
    prototypeLocales: Object.freeze(['el-GR', 'en-GB', 'de-DE'] as const),
    essential: Object.freeze(essential),
  });
}

export function validateAppScope(scope: string, origin: string): URL {
  const url = new URL(scope);
  if (
    url.origin !== origin ||
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.endsWith('/') ||
    !/^\/[A-Za-z0-9/_-]*$/.test(url.pathname)
  ) {
    throw new Error('INVALID_APP_SCOPE');
  }
  return url;
}

export function shellCachePrefix(scope: URL): string {
  return `math-adventure-shell:${encodeURIComponent(scope.pathname)}:schema1:`;
}

export function isAppClientURL(value: string, scope: URL): boolean {
  try {
    const url = new URL(value);
    return (
      url.origin === scope.origin &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith(scope.pathname)
    );
  } catch {
    return false;
  }
}

export function essentialURL(resource: EssentialResource, scope: URL): string {
  return new URL(resource.path, scope).href;
}

export function sameClientSet(
  a: readonly string[],
  b: readonly string[],
): boolean {
  return (
    a.length > 0 &&
    a.length <= MAX_REQUIRED_CLIENTS &&
    a.length === b.length &&
    new Set(a).size === a.length &&
    new Set(b).size === b.length &&
    a.every((id) => b.includes(id))
  );
}
