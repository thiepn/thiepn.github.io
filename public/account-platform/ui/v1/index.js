const DEFAULT_LABELS = Object.freeze({
  checking: 'Checking account…',
  signedOut: 'Sign in',
  signedIn: 'Signed in',
  signOut: 'Sign out',
  unavailable: 'Account temporarily unavailable',
});

function requireElement(root) {
  if (!root || typeof root.replaceChildren !== 'function') throw new TypeError('A DOM root element is required.');
  return root;
}

export function mountThiepnAccountControl({ account, root, onSignInRequest, labels = {} } = {}) {
  if (!account || typeof account.getSession !== 'function' || typeof account.signOut !== 'function') {
    throw new TypeError('A THIEPN Account SDK instance is required.');
  }
  const host = requireElement(root);
  const text = Object.freeze({ ...DEFAULT_LABELS, ...labels });
  const status = document.createElement('span');
  const button = document.createElement('button');
  status.className = 'thiepn-account-control__status';
  button.className = 'thiepn-account-control__action';
  button.type = 'button';
  button.disabled = true;
  status.textContent = text.checking;
  button.textContent = text.signedOut;
  host.classList.add('thiepn-account-control');
  host.replaceChildren(status, button);

  let session = null;
  let destroyed = false;

  async function refresh() {
    if (destroyed) return null;
    button.disabled = true;
    try {
      session = await account.getSession();
      if (session) {
        status.textContent = session.user?.email ? `${text.signedIn}: ${session.user.email}` : text.signedIn;
        button.textContent = text.signOut;
        button.disabled = false;
        button.dataset.accountState = 'signed-in';
      } else {
        status.textContent = text.signedOut;
        button.textContent = text.signedOut;
        button.disabled = false;
        button.dataset.accountState = 'signed-out';
      }
      return session;
    } catch (error) {
      session = null;
      status.textContent = text.unavailable;
      button.textContent = text.signedOut;
      button.disabled = true;
      button.dataset.accountState = account.classifyError?.(error) || 'unavailable';
      return null;
    }
  }

  async function activate() {
    if (button.disabled || destroyed) return;
    if (session) {
      button.disabled = true;
      try { await account.signOut(); } finally { await refresh(); }
      return;
    }
    if (typeof onSignInRequest === 'function') {
      onSignInRequest();
      return;
    }
    if (typeof CustomEvent === 'function') {
      host.dispatchEvent(new CustomEvent('thiepn-account:signin-request', {
        bubbles: true,
        detail: Object.freeze({ source: 'account-control' }),
      }));
    }
  }

  button.addEventListener('click', activate);
  const subscription = account.onAuthStateChange?.(() => refresh()) ?? null;
  void refresh();

  return Object.freeze({
    refresh,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      button.removeEventListener('click', activate);
      subscription?.unsubscribe?.();
      host.replaceChildren();
      host.classList.remove('thiepn-account-control');
    },
  });
}
