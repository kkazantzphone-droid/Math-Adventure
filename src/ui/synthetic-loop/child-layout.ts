import type { ExactPoint } from '../../domain/geometry/scene';
import type { QuantityItem } from '../../domain/families/slice';

/** Layout only: neither coordinates nor drawn dimensions decide truth. */
export function childPoint(point: ExactPoint): readonly [number, number] {
  return [
    Number(point.x.numerator) / Number(point.x.denominator),
    Number(point.y.numerator) / Number(point.y.denominator),
  ];
}
export function childViewport(points: readonly ExactPoint[]): string {
  const xy = points.map(childPoint),
    xs = xy.map(([x]) => x),
    ys = xy.map(([, y]) => y);
  const left = Math.min(...xs) - 1,
    top = Math.min(...ys) - 1;
  return `${left} ${top} ${Math.max(...xs) - left + 1} ${Math.max(...ys) - top + 1}`;
}
export function childItems(
  count: number,
  prefix: string,
): readonly QuantityItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    column: index,
    row: 0,
  }));
}
