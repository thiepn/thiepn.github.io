import { parseWorkflowLocation, workflowLocation, WORKFLOWS } from '../lib/workflows/catalogue';
const root = document.querySelector<HTMLElement>('[data-portal-flows]');
if (root) {
  function render(search = location.search) {
    const position = parseWorkflowLocation(search), flow = WORKFLOWS.find(f => f.id === position.id)!;
    root!.querySelectorAll<HTMLElement>('[data-flow-guide]').forEach(guide => {
      guide.hidden = guide.dataset.flowGuide !== position.id;
      guide.querySelectorAll<HTMLElement>('[data-flow-step]').forEach(step => { const active = !guide.hidden && Number(step.dataset.flowStep) === position.step; if (active) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current'); });
    });
    root!.querySelectorAll<HTMLAnchorElement>('[data-flow-choice]').forEach(link => { if (link.dataset.flowChoice === position.id) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current'); });
    root!.querySelector<HTMLElement>('[data-flow-status]')!.textContent = `${flow.title} · Step ${position.step + 1} of ${flow.steps.length}. Guide position only; no file transfer or app outcome confirmed.`;
    // Retain public guide coordinates only, never arbitrary payload/query fields.
    history.replaceState(null, '', workflowLocation(position.id, position.step));
  }
  root.addEventListener('click', event => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('[data-flow-choice], [data-flow-position]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); history.pushState(null, '', link.href); render();
  });
  window.addEventListener('popstate', () => render()); render();
}
