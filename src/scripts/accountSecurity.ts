import '../styles/account-security.css';
import {
  createAccountClient,
  getMfaFactors,
  getSessionSecurity,
  getVerifiedMfaFactors,
  needsMfaChallenge,
} from '../../packages/account-sdk/index.js';

interface AccountSessionRow {
  session_id: string;
  created_at: string | null;
  updated_at: string | null;
  refreshed_at: string | null;
  not_after: string | null;
  user_agent: string | null;
  aal: string | null;
  is_current: boolean;
}

interface MfaFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status?: string;
  created_at?: string;
  phone?: string;
}

interface AccountUser {
  id: string;
  email?: string;
  factors?: MfaFactor[];
  [key: string]: unknown;
}

interface EnrollmentPayload {
  id?: string;
  type?: string;
  totp?: {
    qr_code?: string;
    secret?: string;
    uri?: string;
  };
}

type Tone = 'neutral' | 'success' | 'error';

const client = createAccountClient();
const root = document.querySelector<HTMLElement>('[data-account-root]');
const signedIn = document.querySelector<HTMLElement>('[data-account-signed-in]');
const signedOut = document.querySelector<HTMLElement>('[data-account-signed-out]');

let currentUser: AccountUser | null = null;
let currentFactors: MfaFactor[] = [];
let gateChallengeId: string | null = null;
let pendingEnrollment: EnrollmentPayload | null = null;
let refreshing = false;

function qs<T extends Element>(selector: string, scope: ParentNode = document): T | null {
  return scope.querySelector<T>(selector);
}

function setStatus(element: HTMLElement | null, message: string, tone: Tone = 'neutral'): void {
  if (!element) return;
  element.textContent = message;
  element.dataset.tone = tone;
  element.hidden = message.length === 0;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function safeQrSource(value: string | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('data:image/svg+xml') || value.startsWith('data:image/png')) return value;
  if (value.trimStart().startsWith('<svg')) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`;
  }
  return null;
}

function factorLabel(factor: MfaFactor): string {
  if (factor.friendly_name?.trim()) return factor.friendly_name.trim();
  if (factor.factor_type === 'totp') return 'Authenticator app';
  if (factor.factor_type === 'phone') return factor.phone ? `Phone ${factor.phone}` : 'Phone';
  return 'Verification factor';
}

function describeUserAgent(value: string | null): string {
  if (!value) return 'Unknown browser';
  const browser = value.includes('Edg/')
    ? 'Edge'
    : value.includes('Firefox/')
      ? 'Firefox'
      : value.includes('Chrome/')
        ? 'Chrome'
        : value.includes('Safari/')
          ? 'Safari'
          : 'Browser';
  const platform = value.includes('Android')
    ? 'Android'
    : /iPhone|iPad/.test(value)
      ? 'iOS/iPadOS'
      : value.includes('Windows')
        ? 'Windows'
        : value.includes('Mac OS')
          ? 'macOS'
          : value.includes('Linux')
            ? 'Linux'
            : 'Unknown device';
  return `${browser} · ${platform}`;
}

function mountStaticUi(): void {
  if (!root || root.dataset.a3SecurityMounted === 'true') return;
  root.dataset.a3SecurityMounted = 'true';

  const authPanel = qs<HTMLElement>('.account-auth__panel', root);
  if (authPanel) {
    const otp = document.createElement('section');
    otp.className = 'account-a3-block';
    otp.dataset.a3EmailOtp = '';
    otp.innerHTML = `
      <h3>Email sign-in code</h3>
      <p class="account-a3-muted">Use the email above without a password. Existing accounts only; this never creates a new account.</p>
      <div class="account-a3-row">
        <button class="account-secondary-button" type="button" data-a3-email-otp-request>Send sign-in email</button>
      </div>
      <div class="account-a3-row" data-a3-email-otp-verify hidden>
        <input type="text" inputmode="numeric" autocomplete="one-time-code" aria-label="Email sign-in code" placeholder="6-digit code" maxlength="12" data-a3-email-otp-code />
        <button class="account-secondary-button" type="button" data-a3-email-otp-submit>Verify code</button>
      </div>
      <p class="account-a3-status" data-a3-email-otp-status aria-live="polite" hidden></p>
    `;
    authPanel.append(otp);
  }

  if (signedOut) {
    const gate = document.createElement('section');
    gate.className = 'account-mfa-gate';
    gate.dataset.accountMfaGate = '';
    gate.hidden = true;
    gate.setAttribute('aria-labelledby', 'account-mfa-gate-heading');
    gate.innerHTML = `
      <p class="section-index">Additional verification</p>
      <h2 id="account-mfa-gate-heading">Verify your second factor.</h2>
      <p>This THIEPN Account has two-step verification enabled. Complete the second factor before account controls are shown.</p>
      <div class="account-mfa-gate__controls">
        <label>
          <span>Verification method</span>
          <select data-a3-gate-factor></select>
        </label>
        <button class="account-secondary-button" type="button" data-a3-gate-start>Start verification</button>
        <form class="account-a3-row" data-a3-gate-form>
          <input type="text" inputmode="numeric" autocomplete="one-time-code" aria-label="Authenticator code" placeholder="Verification code" maxlength="12" data-a3-gate-code disabled />
          <button class="button" type="submit" data-a3-gate-verify disabled>Verify</button>
        </form>
        <button class="account-text-button" type="button" data-a3-gate-sign-out>Sign out instead</button>
        <p class="account-a3-status" data-a3-gate-status aria-live="polite" hidden></p>
        <p class="account-a3-muted">Password reset does not bypass two-step verification. Keep a second authenticator factor on a separate device as recovery.</p>
      </div>
    `;
    signedOut.insertAdjacentElement('afterend', gate);
  }

  const securityHeading = qs<HTMLElement>('#security-heading', root);
  const securityCard = securityHeading?.closest<HTMLElement>('.account-card');
  if (securityCard) {
    const advanced = document.createElement('section');
    advanced.className = 'account-security-advanced';
    advanced.dataset.a3SecurityAdvanced = '';
    advanced.innerHTML = `
      <div class="account-security-advanced__header">
        <div>
          <h3>Two-step verification</h3>
          <p class="account-a3-muted">Authenticator-app TOTP is optional. Once enabled, the account dashboard requires an AAL2 session.</p>
        </div>
        <span class="account-security-badge" data-a3-mfa-badge data-state="neutral">Checking…</span>
      </div>
      <ul class="account-factor-list" data-a3-factor-list></ul>
      <div class="account-a3-row">
        <button class="account-secondary-button" type="button" data-a3-mfa-enroll>Add authenticator</button>
      </div>
      <div class="account-totp-enrollment" data-a3-enrollment hidden>
        <strong>Set up authenticator</strong>
        <p class="account-a3-muted">Scan the QR code or enter the secret manually. Then verify a current code.</p>
        <img class="account-totp-enrollment__qr" alt="Authenticator setup QR code" data-a3-enrollment-qr hidden />
        <span class="account-a3-muted">Secret</span>
        <code class="account-totp-secret" data-a3-enrollment-secret></code>
        <form class="account-a3-row" data-a3-enrollment-form>
          <input type="text" inputmode="numeric" autocomplete="one-time-code" aria-label="Authenticator setup code" placeholder="6-digit code" maxlength="12" data-a3-enrollment-code />
          <button class="button" type="submit">Enable</button>
          <button class="account-secondary-button" type="button" data-a3-enrollment-cancel>Cancel</button>
        </form>
      </div>
      <p class="account-a3-status" data-a3-mfa-status aria-live="polite" hidden></p>

      <section class="account-security-section" aria-labelledby="account-sessions-heading">
        <div class="account-security-section__head">
          <div>
            <h3 id="account-sessions-heading">Active sessions</h3>
            <p class="account-a3-muted">Review browsers signed into this THIEPN Account.</p>
          </div>
          <button class="account-secondary-button" type="button" data-a3-sign-out-others>Sign out other devices</button>
        </div>
        <ul class="account-session-list" data-a3-session-list></ul>
        <p class="account-a3-status" data-a3-session-status aria-live="polite" hidden></p>
      </section>

      <section class="account-security-section" aria-labelledby="account-recovery-heading">
        <h3 id="account-recovery-heading">Recovery readiness</h3>
        <p class="account-a3-muted" data-a3-recovery-state></p>
        <div class="account-a3-row">
          <button class="account-secondary-button" type="button" data-a3-send-recovery>Send password recovery email</button>
        </div>
        <p class="account-a3-status" data-a3-recovery-status aria-live="polite" hidden></p>
      </section>
    `;
    securityCard.append(advanced);
  }
}

function bindPasswordFloor(): void {
  const createButton = qs<HTMLButtonElement>('[data-auth-create]');
  createButton?.addEventListener('click', (event) => {
    const password = qs<HTMLInputElement>('[data-auth-password]')?.value ?? '';
    if (password.length >= 12) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setStatus(qs<HTMLElement>('[data-auth-status]'), 'New THIEPN Account passwords must use at least 12 characters.', 'error');
  }, { capture: true });

  const passwordForm = qs<HTMLFormElement>('[data-password-form]');
  const password = qs<HTMLInputElement>('[data-security-new-password]');
  const confirm = qs<HTMLInputElement>('[data-security-confirm-password]');
  if (password) {
    password.minLength = 12;
    password.placeholder = 'At least 12 characters';
  }
  if (confirm) confirm.minLength = 12;
  passwordForm?.addEventListener('submit', (event) => {
    if ((password?.value.length ?? 0) >= 12) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setStatus(qs<HTMLElement>('[data-password-status]'), 'Use at least 12 characters for the new password.', 'error');
  }, { capture: true });
}

function bindEmailOtp(): void {
  const requestButton = qs<HTMLButtonElement>('[data-a3-email-otp-request]');
  const verifyWrap = qs<HTMLElement>('[data-a3-email-otp-verify]');
  const code = qs<HTMLInputElement>('[data-a3-email-otp-code]');
  const submit = qs<HTMLButtonElement>('[data-a3-email-otp-submit]');
  const status = qs<HTMLElement>('[data-a3-email-otp-status]');

  requestButton?.addEventListener('click', async () => {
    const email = qs<HTMLInputElement>('[data-auth-email]')?.value.trim() ?? '';
    if (!email) {
      setStatus(status, 'Enter your email above first.', 'error');
      return;
    }
    requestButton.disabled = true;
    setStatus(status, 'Sending sign-in email…');
    try {
      await client.requestEmailOtp({ email, shouldCreateUser: false });
      if (verifyWrap) verifyWrap.hidden = false;
      code?.focus();
      setStatus(status, 'Check your email. Enter the code if the message contains one; if it contains a sign-in link, open that link instead.', 'success');
    } catch (error) {
      setStatus(status, error instanceof Error ? error.message : 'Could not send the sign-in email.', 'error');
    } finally {
      requestButton.disabled = false;
    }
  });

  submit?.addEventListener('click', async () => {
    const email = qs<HTMLInputElement>('[data-auth-email]')?.value.trim() ?? '';
    const token = code?.value.trim() ?? '';
    if (!email || !token) {
      setStatus(status, 'Enter the email and verification code.', 'error');
      return;
    }
    submit.disabled = true;
    setStatus(status, 'Verifying…');
    try {
      await client.verifyEmailOtp({ email, token });
      setStatus(status, 'Verified. Opening your account…', 'success');
      window.location.reload();
    } catch (error) {
      setStatus(status, error instanceof Error ? error.message : 'The code could not be verified.', 'error');
      submit.disabled = false;
    }
  });
}

function renderGateFactors(factors: MfaFactor[]): void {
  const select = qs<HTMLSelectElement>('[data-a3-gate-factor]');
  if (!select) return;
  select.replaceChildren();
  factors.forEach((factor) => {
    const option = document.createElement('option');
    option.value = factor.id;
    option.textContent = `${factorLabel(factor)} · ${factor.factor_type.toUpperCase()}`;
    select.append(option);
  });
  gateChallengeId = null;
  const code = qs<HTMLInputElement>('[data-a3-gate-code]');
  const verify = qs<HTMLButtonElement>('[data-a3-gate-verify]');
  if (code) {
    code.disabled = true;
    code.value = '';
  }
  if (verify) verify.disabled = true;
}

function showMfaGate(factors: MfaFactor[]): void {
  if (signedIn) signedIn.hidden = true;
  const gate = qs<HTMLElement>('[data-account-mfa-gate]');
  if (gate) gate.hidden = false;
  renderGateFactors(factors);
}

function hideMfaGate(): void {
  const gate = qs<HTMLElement>('[data-account-mfa-gate]');
  if (gate) gate.hidden = true;
}

function bindMfaGate(): void {
  const select = qs<HTMLSelectElement>('[data-a3-gate-factor]');
  const start = qs<HTMLButtonElement>('[data-a3-gate-start]');
  const form = qs<HTMLFormElement>('[data-a3-gate-form]');
  const code = qs<HTMLInputElement>('[data-a3-gate-code]');
  const verify = qs<HTMLButtonElement>('[data-a3-gate-verify]');
  const status = qs<HTMLElement>('[data-a3-gate-status]');

  select?.addEventListener('change', () => {
    gateChallengeId = null;
    if (code) {
      code.value = '';
      code.disabled = true;
    }
    if (verify) verify.disabled = true;
    setStatus(status, '');
  });

  start?.addEventListener('click', async () => {
    const factorId = select?.value ?? '';
    const factor = currentFactors.find((entry) => entry.id === factorId);
    if (!factorId || !factor) return;
    start.disabled = true;
    setStatus(status, factor.factor_type === 'phone' ? 'Sending verification code…' : 'Preparing authenticator challenge…');
    try {
      const challenge = await client.challengeMfa({
        factorId,
        channel: factor.factor_type === 'phone' ? 'sms' : undefined,
      }) as { id?: string };
      if (!challenge.id) throw new Error('The verification challenge did not return an ID.');
      gateChallengeId = challenge.id;
      if (code) code.disabled = false;
      if (verify) verify.disabled = false;
      code?.focus();
      setStatus(status, factor.factor_type === 'phone' ? 'Code sent. Enter it below.' : 'Challenge ready. Enter the current authenticator code.', 'success');
    } catch (error) {
      setStatus(status, error instanceof Error ? error.message : 'Could not start verification.', 'error');
    } finally {
      start.disabled = false;
    }
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const factorId = select?.value ?? '';
    const token = code?.value.trim() ?? '';
    if (!factorId || !gateChallengeId || !token) {
      setStatus(status, 'Start verification and enter the current code.', 'error');
      return;
    }
    if (verify) verify.disabled = true;
    setStatus(status, 'Verifying…');
    try {
      await client.verifyMfa({ factorId, challengeId: gateChallengeId, code: token });
      setStatus(status, 'Verified. Reloading the protected account session…', 'success');
      window.location.reload();
    } catch (error) {
      if (verify) verify.disabled = false;
      setStatus(status, error instanceof Error ? error.message : 'Verification failed.', 'error');
    }
  });

  qs<HTMLButtonElement>('[data-a3-gate-sign-out]')?.addEventListener('click', async () => {
    await client.signOut({ scope: 'local' });
    window.location.reload();
  });
}

function renderFactors(): void {
  const list = qs<HTMLUListElement>('[data-a3-factor-list]');
  const badge = qs<HTMLElement>('[data-a3-mfa-badge]');
  const recovery = qs<HTMLElement>('[data-a3-recovery-state]');
  if (!list || !badge) return;
  list.replaceChildren();

  const verified = currentFactors.filter((factor) => factor.status === 'verified');
  const security = getSessionSecurity(client.readSession());
  if (verified.length === 0) {
    badge.textContent = 'Not enabled';
    badge.dataset.state = 'neutral';
    const item = document.createElement('li');
    item.className = 'account-a3-muted';
    item.textContent = 'No verified second factor is enrolled.';
    list.append(item);
    if (recovery) recovery.textContent = 'Password recovery and Google remain available. Add an authenticator if you want stronger account protection.';
    return;
  }

  badge.textContent = security.aal === 'aal2' ? 'Protected · AAL2' : 'Verification required';
  badge.dataset.state = security.aal === 'aal2' ? 'protected' : 'attention';

  currentFactors.forEach((factor) => {
    const item = document.createElement('li');
    item.className = 'account-factor-item';
    const copy = document.createElement('div');
    copy.className = 'account-factor-item__copy';
    const strong = document.createElement('strong');
    strong.textContent = factorLabel(factor);
    const small = document.createElement('small');
    small.textContent = `${factor.factor_type.toUpperCase()} · ${factor.status ?? 'unknown'}${factor.created_at ? ` · Added ${formatDate(factor.created_at)}` : ''}`;
    copy.append(strong, small);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'account-mini-button';
    remove.dataset.a3RemoveFactor = factor.id;
    remove.textContent = factor.status === 'verified' ? 'Remove' : 'Cancel setup';
    item.append(copy, remove);
    list.append(item);
  });

  if (recovery) {
    recovery.textContent = verified.length >= 2
      ? 'You have a backup second factor. Keep the factors on separate devices or in separate authenticator stores.'
      : 'Two-step verification is enabled, but there is no backup factor. Add a second authenticator before you need recovery.';
  }
}

function renderEnrollment(payload: EnrollmentPayload | null): void {
  const panel = qs<HTMLElement>('[data-a3-enrollment]');
  const image = qs<HTMLImageElement>('[data-a3-enrollment-qr]');
  const secret = qs<HTMLElement>('[data-a3-enrollment-secret]');
  const code = qs<HTMLInputElement>('[data-a3-enrollment-code]');
  if (!panel) return;
  pendingEnrollment = payload;
  panel.hidden = !payload;
  if (!payload) {
    if (code) code.value = '';
    return;
  }
  const source = safeQrSource(payload.totp?.qr_code);
  if (image) {
    image.hidden = !source;
    if (source) image.src = source;
    else image.removeAttribute('src');
  }
  if (secret) secret.textContent = payload.totp?.secret ?? payload.totp?.uri ?? 'Secret unavailable';
  code?.focus();
}

function bindMfaManagement(): void {
  const enroll = qs<HTMLButtonElement>('[data-a3-mfa-enroll]');
  const status = qs<HTMLElement>('[data-a3-mfa-status]');
  const enrollmentForm = qs<HTMLFormElement>('[data-a3-enrollment-form]');
  const enrollmentCode = qs<HTMLInputElement>('[data-a3-enrollment-code]');

  enroll?.addEventListener('click', async () => {
    enroll.disabled = true;
    setStatus(status, 'Creating authenticator setup…');
    try {
      const payload = await client.enrollTotp({ friendlyName: 'THIEPN Account authenticator' }) as EnrollmentPayload;
      if (!payload.id) throw new Error('Authenticator setup did not return a factor ID.');
      renderEnrollment(payload);
      setStatus(status, 'Scan the QR code, then verify a current code.', 'success');
    } catch (error) {
      setStatus(status, error instanceof Error ? error.message : 'Could not start authenticator setup.', 'error');
    } finally {
      enroll.disabled = false;
    }
  });

  enrollmentForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const factorId = pendingEnrollment?.id;
    const code = enrollmentCode?.value.trim() ?? '';
    if (!factorId || !code) {
      setStatus(status, 'Enter the current authenticator code.', 'error');
      return;
    }
    const submit = enrollmentForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) submit.disabled = true;
    setStatus(status, 'Verifying authenticator…');
    try {
      const challenge = await client.challengeMfa({ factorId }) as { id?: string };
      if (!challenge.id) throw new Error('Authenticator challenge did not return an ID.');
      await client.verifyMfa({ factorId, challengeId: challenge.id, code });
      setStatus(status, 'Two-step verification enabled. Other sessions were invalidated by the authentication provider.', 'success');
      window.location.reload();
    } catch (error) {
      if (submit) submit.disabled = false;
      setStatus(status, error instanceof Error ? error.message : 'Could not verify the authenticator.', 'error');
    }
  });

  qs<HTMLButtonElement>('[data-a3-enrollment-cancel]')?.addEventListener('click', async () => {
    const factorId = pendingEnrollment?.id;
    renderEnrollment(null);
    if (!factorId) return;
    try {
      await client.unenrollMfa({ factorId });
      setStatus(status, 'Authenticator setup cancelled.');
    } catch (error) {
      setStatus(status, error instanceof Error ? error.message : 'Could not cancel authenticator setup.', 'error');
    }
  });

  qs<HTMLElement>('[data-a3-factor-list]')?.addEventListener('click', async (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-a3-remove-factor]') : null;
    if (!target) return;
    const factorId = target.dataset.a3RemoveFactor;
    if (!factorId) return;
    target.disabled = true;
    setStatus(status, 'Removing verification factor…');
    try {
      await client.unenrollMfa({ factorId });
      await client.refreshSession();
      setStatus(status, 'Verification factor removed.', 'success');
      window.location.reload();
    } catch (error) {
      target.disabled = false;
      setStatus(status, error instanceof Error ? error.message : 'Could not remove the verification factor.', 'error');
    }
  });
}

function renderSessions(rows: AccountSessionRow[]): void {
  const list = qs<HTMLUListElement>('[data-a3-session-list]');
  if (!list) return;
  list.replaceChildren();
  if (!rows.length) {
    const item = document.createElement('li');
    item.className = 'account-a3-muted';
    item.textContent = 'No active sessions were returned.';
    list.append(item);
    return;
  }

  rows.forEach((row) => {
    const item = document.createElement('li');
    item.className = 'account-session-item';
    const copy = document.createElement('div');
    copy.className = 'account-session-item__copy';
    const strong = document.createElement('strong');
    strong.textContent = row.is_current ? `${describeUserAgent(row.user_agent)} · This device` : describeUserAgent(row.user_agent);
    const small = document.createElement('small');
    small.textContent = `Last active ${formatDate(row.updated_at ?? row.refreshed_at)} · ${(row.aal ?? 'aal1').toUpperCase()}`;
    copy.append(strong, small);
    item.append(copy);
    list.append(item);
  });
}

async function loadSessions(): Promise<void> {
  const status = qs<HTMLElement>('[data-a3-session-status]');
  setStatus(status, 'Loading active sessions…');
  try {
    const rows = await client.listAccountSessions() as AccountSessionRow[];
    renderSessions(Array.isArray(rows) ? rows : []);
    setStatus(status, '');
  } catch (error) {
    setStatus(status, error instanceof Error ? error.message : 'Could not load active sessions.', 'error');
  }
}

function bindSessions(): void {
  const button = qs<HTMLButtonElement>('[data-a3-sign-out-others]');
  const status = qs<HTMLElement>('[data-a3-session-status]');
  button?.addEventListener('click', async () => {
    button.disabled = true;
    setStatus(status, 'Signing out other devices…');
    try {
      await client.signOutOtherSessions();
      await loadSessions();
      setStatus(status, 'Other refresh sessions were revoked. Already-issued access tokens can remain valid until their normal expiry.', 'success');
    } catch (error) {
      setStatus(status, error instanceof Error ? error.message : 'Could not sign out other devices.', 'error');
    } finally {
      button.disabled = false;
    }
  });
}

function bindRecovery(): void {
  const button = qs<HTMLButtonElement>('[data-a3-send-recovery]');
  const status = qs<HTMLElement>('[data-a3-recovery-status]');
  button?.addEventListener('click', async () => {
    const email = currentUser?.email?.trim();
    if (!email) {
      setStatus(status, 'This account does not currently have an email address for password recovery.', 'error');
      return;
    }
    button.disabled = true;
    setStatus(status, 'Sending password recovery email…');
    try {
      await client.requestPasswordReset({ email, redirectTo: `${window.location.origin}/account/` });
      setStatus(status, 'Recovery email sent. Password recovery does not bypass an enrolled second factor.', 'success');
    } catch (error) {
      setStatus(status, error instanceof Error ? error.message : 'Could not send the recovery email.', 'error');
    } finally {
      button.disabled = false;
    }
  });
}

function bindDeleteGuard(): void {
  const button = qs<HTMLButtonElement>('[data-delete-account]');
  button?.addEventListener('click', (event) => {
    const session = client.readSession();
    if (!session || !needsMfaChallenge(session, currentUser ?? session.user)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showMfaGate(getVerifiedMfaFactors(currentUser ?? session.user) as MfaFactor[]);
    setStatus(qs<HTMLElement>('[data-a3-gate-status]'), 'Verify your second factor before deleting the account.', 'error');
  }, { capture: true });
}

async function refreshSecuritySurface(): Promise<void> {
  if (refreshing) return;
  refreshing = true;
  try {
    let session = client.readSession();
    if (!session) {
      currentUser = null;
      currentFactors = [];
      hideMfaGate();
      return;
    }

    try {
      const user = await client.getUser(session) as AccountUser | null;
      if (user?.id) {
        currentUser = user;
        session = client.writeSession({ ...session, user });
      } else {
        currentUser = session.user as AccountUser;
      }
    } catch {
      currentUser = session.user as AccountUser;
    }

    currentFactors = getMfaFactors(currentUser) as MfaFactor[];
    const verified = getVerifiedMfaFactors(currentUser) as MfaFactor[];
    if (needsMfaChallenge(session, currentUser)) {
      showMfaGate(verified);
      return;
    }

    hideMfaGate();
    renderFactors();
    await loadSessions();
  } finally {
    refreshing = false;
  }
}

function observeSignedInState(): void {
  if (!signedIn) return;
  const observer = new MutationObserver(() => {
    if (!signedIn.hidden) void refreshSecuritySurface();
  });
  observer.observe(signedIn, { attributes: true, attributeFilter: ['hidden'] });
}

function mount(): void {
  if (!root) return;
  mountStaticUi();
  bindPasswordFloor();
  bindEmailOtp();
  bindMfaGate();
  bindMfaManagement();
  bindSessions();
  bindRecovery();
  bindDeleteGuard();
  observeSignedInState();
  void refreshSecuritySurface();
}

mount();
