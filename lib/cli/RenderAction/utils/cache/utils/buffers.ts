export function abtosab(ab: ArrayBuffer): SharedArrayBuffer {
  const sab = new SharedArrayBuffer(ab.byteLength);
  /** Effectively replaces the empty sab with the contents of ab */
  const view = new Uint8Array(sab);
  view.set(new Uint8Array(ab));
  return sab;
}
