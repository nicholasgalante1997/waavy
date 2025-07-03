export function objectIsEmpty<O extends object = {}>(o: O) {
  return (
    Object.keys(o).length === 0 &&
    Object.values(o).length === 0 &&
    Object.getOwnPropertyNames(o).length === 0
  );
}

/**
 * TODO (nick) Write tests for this
 */
export function createDeterministicStructure(obj: object) {
  function processValue(value: unknown): any {
    if (value === null || typeof value !== "object") {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(processValue);
    }

    // Convert to sorted array of [key, value] pairs
    const sortedKeys = Object.keys(value).sort();
    return sortedKeys.map((key) => [key, processValue((value as any)[key])]);
  }

  return processValue(obj);
}
