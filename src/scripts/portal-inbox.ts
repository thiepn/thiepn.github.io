import './portal-auth';
const root = document.querySelector<HTMLElement>('[data-portal-inbox]');
if (root) {
  const hide = root.querySelector<HTMLButtonElement>('[data-inbox-hide]')!;
  const content = root.querySelector<HTMLElement>('[data-inbox-content]')!;
  const account = root.querySelector<HTMLElement>('[data-hub-account]')!;
  const hidden = root.querySelector<HTMLElement>('[data-inbox-hidden]')!;
  const items = root.querySelector<HTMLElement>('[data-inbox-items]')!;
  let masked = false;
  hide.hidden = false;
  hide.addEventListener('click', () => { masked = !masked; content.hidden = account.hidden = masked; hidden.hidden = !masked; hide.textContent = masked ? 'Show Inbox' : 'Hide Inbox'; if (masked) items.replaceChildren(); });
  // Private owner transports are not wired. Keep future contribution DOM clear at boundaries.
  window.addEventListener('hub:identity', () => items.replaceChildren());
  window.addEventListener('pagehide', () => items.replaceChildren());
  document.addEventListener('visibilitychange', () => { if (document.hidden) items.replaceChildren(); });
}
