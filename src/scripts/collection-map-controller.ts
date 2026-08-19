function initCollectionMap(root: HTMLElement) {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-collection-node]'));
  const previews = Array.from(root.querySelectorAll<HTMLElement>('[data-collection-preview]'));
  const edges = Array.from(root.querySelectorAll<HTMLElement>('[data-collection-edge]'));
  const relations = Array.from(root.querySelectorAll<HTMLElement>('[data-collection-relation]'));
  const status = root.querySelector<HTMLElement>('[data-collection-map-status]');
  if (!nodes.length) return;

  const initialSlug = root.dataset.initialSlug || nodes[0]?.dataset.projectSlug || '';
  let activeSlug = initialSlug;

  const apply = (slug: string, announce = false) => {
    if (!slug) return;
    activeSlug = slug;
    root.dataset.activeSlug = slug;
    nodes.forEach((node) => {
      const active = node.dataset.projectSlug === slug;
      node.classList.toggle('is-active', active);
    });
    previews.forEach((preview) => {
      const active = preview.dataset.collectionPreview === slug;
      preview.hidden = !active;
      preview.classList.toggle('is-active', active);
    });
    edges.forEach((edge) => {
      const active = edge.dataset.edgeFrom === slug || edge.dataset.edgeTo === slug;
      edge.classList.toggle('is-active', active);
    });
    relations.forEach((relation) => {
      const active = relation.dataset.relationFrom === slug || relation.dataset.relationTo === slug;
      relation.classList.toggle('is-active', active);
      relation.setAttribute('aria-pressed', String(active));
    });
    if (announce && status) {
      const node = nodes.find((candidate) => candidate.dataset.projectSlug === slug);
      status.textContent = node?.dataset.projectTitle ? `${node.dataset.projectTitle} selected in collection map.` : 'Collection artifact selected.';
    }
  };

  nodes.forEach((node) => {
    const slug = node.dataset.projectSlug || '';
    node.addEventListener('pointerenter', () => apply(slug));
    node.addEventListener('focus', () => apply(slug, true));
  });

  relations.forEach((relation) => {
    const from = relation.dataset.relationFrom || '';
    const to = relation.dataset.relationTo || '';
    relation.addEventListener('pointerenter', () => apply(from));
    relation.addEventListener('focus', () => apply(from, true));
    relation.addEventListener('click', () => apply(activeSlug === from ? to : from, true));
  });

  root.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') apply(initialSlug);
  });

  apply(initialSlug);
}

document.querySelectorAll<HTMLElement>('[data-collection-map]').forEach(initCollectionMap);

export {};
