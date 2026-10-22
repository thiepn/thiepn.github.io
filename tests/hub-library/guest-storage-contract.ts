/** The Hub Account credential cache is not Library reading storage.
 * Every other opened database still fails closed before explicit sharing. */
export function unexpectedGuestIndexedDbNames(names: readonly (string | null | undefined)[]): string[] {
  return names.filter(name => name !== 'thiepn-adaptive-workspace' && name !== 'thiepn-hub-account')
    .map(name => name ?? '<unnamed database>');
}
