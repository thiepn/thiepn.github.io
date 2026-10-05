import './portal-auth';
import { mountInbox } from '../lib/inbox-controller';
const root = document.querySelector<HTMLElement>('[data-portal-inbox]');
if (root) {
  const hide = root.querySelector<HTMLButtonElement>('[data-inbox-hide]')!;
  const content = root.querySelector<HTMLElement>('[data-inbox-content]')!;
  const account = root.querySelector<HTMLElement>('[data-hub-account]')!;
  const hidden = root.querySelector<HTMLElement>('[data-inbox-hidden]')!;
  // No owner has yet qualified an Inbox adapter. Public builds perform no reads.
  const inbox = mountInbox(root, []);
  let masked = false;
  hide.hidden = false;
  hide.addEventListener('click', () => { masked = !masked; content.hidden = account.hidden = masked; hidden.hidden = !masked; hide.textContent = masked ? 'Show Inbox' : 'Hide Inbox'; if (masked) inbox.clear(); });
  window.addEventListener('hub:identity', () => inbox.clear());
  window.addEventListener('pagehide', () => inbox.clear());
  document.addEventListener('visibilitychange', () => { if (document.hidden) inbox.clear(); });
}
