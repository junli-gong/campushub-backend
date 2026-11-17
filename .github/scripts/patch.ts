export interface Repair {
  reason: string;
  before: string;
  after: string;
}
export function parseRepair(value: unknown): Repair {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('reason' in value) ||
    !('before' in value) ||
    !('after' in value)
  )
    throw new Error('Model must return reason, before, after');
  const { reason, before, after } = value;
  if (
    typeof reason !== 'string' ||
    typeof before !== 'string' ||
    typeof after !== 'string' ||
    !reason.trim() ||
    !before.trim() ||
    !after.trim() ||
    before === after
  )
    throw new Error('Repair must be nonempty and change source');
  if (
    reason.length > 2000 ||
    before.length > 3000 ||
    after.length > 3000 ||
    before.split('\n').length > 20 ||
    after.split('\n').length > 20
  )
    throw new Error('Repair exceeds the small-patch limit');
  return { reason, before, after };
}
export function applyRepair(source: string, repair: Repair): string {
  const first = source.indexOf(repair.before);
  if (first < 0 || source.indexOf(repair.before, first + 1) >= 0)
    throw new Error('Repair must match exactly one source occurrence');
  return (
    source.slice(0, first) +
    repair.after +
    source.slice(first + repair.before.length)
  );
}
