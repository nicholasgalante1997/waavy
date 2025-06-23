export function objectIsEmpty<O extends object = {}>(o: O) {
  return (
    Object.keys(o).length === 0 &&
    Object.values(o).length === 0 &&
    Object.getOwnPropertyNames(o).length === 0
  );
}
