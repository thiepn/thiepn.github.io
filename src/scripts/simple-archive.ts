const root = document.querySelector<HTMLElement>('[data-simple-archive]');
if (root) {
  const query = root.querySelector<HTMLInputElement>('[data-archive-query]')!;
  const type = root.querySelector<HTMLSelectElement>('[data-archive-type]')!;
  const sort = root.querySelector<HTMLSelectElement>('[data-archive-sort]')!;
  const rows = root.querySelector<HTMLElement>('[data-simple-rows]')!;
  const count = root.querySelector<HTMLElement>('[data-simple-count]')!;
  const empty = root.querySelector<HTMLElement>('[data-simple-empty]')!;
  const items = [...root.querySelectorAll<HTMLElement>('[data-simple-item]')];
  const normalize = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const validTypes = [...type.options].map(o => o.value);
  function readURL() {
    const params = new URLSearchParams(location.search);
    query.value = params.get('q') ?? params.get('query') ?? '';
    const legacy = ({play:'games',use:'tools',learn:'learning',explore:'visualizations'} as Record<string,string>)[params.get('intent') ?? ''];
    const category = params.get('category') ?? legacy ?? 'all';
    type.value = validTypes.includes(category) ? category : 'all';
    sort.value = ['newest','recent','updated'].includes(params.get('sort') ?? '') ? 'newest' : 'az';
  }
  function render(updateURL = false) {
    const terms = normalize(query.value.trim()).split(/\s+/).filter(Boolean);
    let matched = 0;
    const sorted = [...items].sort((a,b) => sort.value === 'newest' ? (b.dataset.date ?? '').localeCompare(a.dataset.date ?? '') || (a.dataset.title ?? '').localeCompare(b.dataset.title ?? '') : (a.dataset.title ?? '').localeCompare(b.dataset.title ?? ''));
    for (const item of sorted) {
      const search = normalize(item.dataset.search ?? '');
      const show = (type.value === 'all' || item.dataset.type === type.value) && terms.every(term => search.includes(term));
      item.hidden = !show; if (show) matched++;
      rows.append(item);
    }
    count.textContent = `${matched} ${matched === 1 ? 'project' : 'projects'}${matched !== items.length ? ` of ${items.length}` : ''}`;
    empty.hidden = matched > 0;
    if (updateURL) {
      const url = new URL(location.href);url.search='';url.hash='';
      if(query.value.trim())url.searchParams.set('q',query.value.trim());
      if(type.value!=='all')url.searchParams.set('category',type.value);
      if(sort.value!=='az')url.searchParams.set('sort',sort.value);
      if(url.href!==location.href)history.pushState({},'',url);
    }
  }
  let timer: ReturnType<typeof setTimeout>;
  query.addEventListener('input',()=>{clearTimeout(timer);render();timer=setTimeout(()=>render(true),400);});
  for(const control of [type,sort])control.addEventListener('change',()=>{clearTimeout(timer);render(true);});
  root.querySelector('form')!.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);render(true);});
  root.querySelector('[data-simple-reset]')!.addEventListener('click',()=>{clearTimeout(timer);query.value='';type.value='all';sort.value='az';render(true);query.focus();});
  window.addEventListener('popstate',()=>{clearTimeout(timer);readURL();render();});
  readURL();render();
}
export {};
