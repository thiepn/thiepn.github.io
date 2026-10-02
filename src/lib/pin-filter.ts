export function matchesPinTitle(title: string, query: string) {
  const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en');
  const words = normalize(query.slice(0, 200)).trim().split(/\s+/).filter(Boolean);
  return words.every(word => normalize(title).includes(word));
}
