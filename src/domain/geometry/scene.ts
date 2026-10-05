import { dataArray, dataRecord, hasKeys } from '../core/data';
import { identifier } from '../core/identifiers';
import type { SemanticObjectId } from '../core/identifiers';
import { failure, success } from '../core/result';
import type { DomainResult } from '../core/result';
import { rationalFromDto, rationalToDto } from '../math/rational';
import type { RationalDto } from '../math/rational';

export interface ExactPoint {
  readonly x: RationalDto;
  readonly y: RationalDto;
}

export type GeometryObject =
  | {
      readonly kind: 'point';
      readonly id: SemanticObjectId;
      readonly position: ExactPoint;
    }
  | {
      readonly kind: 'segment';
      readonly id: SemanticObjectId;
      readonly start: ExactPoint;
      readonly end: ExactPoint;
    }
  | {
      readonly kind: 'polygon';
      readonly id: SemanticObjectId;
      readonly vertices: readonly ExactPoint[];
    };

export interface GeometryScene {
  readonly schema: 'geometry-scene-v1';
  readonly objects: readonly GeometryObject[];
}

export const GEOMETRY_LIMITS = Object.freeze({ objects: 128, vertices: 64 });

export function pointFromDto(input: unknown): DomainResult<ExactPoint> {
  const record = dataRecord(input);
  if (!record || !hasKeys(record, ['x', 'y'])) return failure('invalid_input');
  const x = rationalFromDto(record.x);
  const y = rationalFromDto(record.y);
  if (!x.ok || !y.ok) return failure('invalid_input');
  return success({ x: rationalToDto(x.value), y: rationalToDto(y.value) });
}

function objectFromDto(input: unknown): DomainResult<GeometryObject> {
  const record = dataRecord(input);
  if (!record) return failure('invalid_input');
  const id = identifier('semanticObject', record.id);
  if (!id.ok) return failure('invalid_input');
  if (record.kind === 'point' && hasKeys(record, ['kind', 'id', 'position'])) {
    const point = pointFromDto(record.position);
    return point.ok
      ? success({ kind: 'point', id: id.value, position: point.value })
      : point;
  }
  if (
    record.kind === 'segment' &&
    hasKeys(record, ['kind', 'id', 'start', 'end'])
  ) {
    const start = pointFromDto(record.start);
    const end = pointFromDto(record.end);
    if (!start.ok || !end.ok) return failure('invalid_input');
    return success({
      kind: 'segment',
      id: id.value,
      start: start.value,
      end: end.value,
    });
  }
  if (
    record.kind === 'polygon' &&
    hasKeys(record, ['kind', 'id', 'vertices'])
  ) {
    const raw = dataArray(record.vertices, GEOMETRY_LIMITS.vertices);
    if (!raw || raw.length < 3) return failure('invalid_input');
    const vertices: ExactPoint[] = [];
    for (const vertex of raw) {
      const point = pointFromDto(vertex);
      if (!point.ok) return point;
      vertices.push(point.value);
    }
    return success({ kind: 'polygon', id: id.value, vertices });
  }
  return failure('invalid_input');
}

// Structural exact scene contract only: no claim of simple/nondegenerate
// polygons, shape classification, distances, area or viewport correctness.
export function geometrySceneFromDto(
  input: unknown,
): DomainResult<GeometryScene> {
  const record = dataRecord(input);
  if (!record || !hasKeys(record, ['schema', 'objects']))
    return failure('invalid_input');
  if (record.schema !== 'geometry-scene-v1')
    return failure('unsupported_version');
  const raw = dataArray(record.objects, GEOMETRY_LIMITS.objects);
  if (!raw) return failure('invalid_input');
  const objects: GeometryObject[] = [];
  const ids = new Set<SemanticObjectId>();
  for (const item of raw) {
    const object = objectFromDto(item);
    if (!object.ok || ids.has(object.value.id)) return failure('invalid_input');
    ids.add(object.value.id);
    objects.push(object.value);
  }
  return success({ schema: 'geometry-scene-v1', objects });
}
