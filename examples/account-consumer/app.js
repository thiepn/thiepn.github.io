import { createThiepnAccount } from '/account-platform/sdk/v1/index.js';

const account = createThiepnAccount({
  createClient: window.supabase.createClient,
  appSlug: 'reference-app',
  redirectTo: new URL('./', window.location.href).href,
});

const state = document.querySelector('#account-state');
const message = document.querySelector('#message');

async function render() {
  try {
    const session = await account.getSession();
    state.textContent = session?.user?.email ? `Signed in as ${session.user.email}` : session ? 'Signed in' : 'Signed out';
  } catch (error) {
    state.textContent = account.classifyError(error) === 'network' ? 'Account temporarily unavailable' : 'Account state unavailable';
  }
}

account.onAuthStateChange(() => render());
document.querySelector('#email-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await account.signInWithPassword({ email: String(form.get('email')), password: String(form.get('password')) });
    message.textContent = '';
    await render();
  } catch (error) { message.textContent = `Sign in failed: ${account.classifyError(error)}`; }
});
document.querySelector('#google').addEventListener('click', () => account.signInWithGoogle().catch((error) => { message.textContent = `Google sign in failed: ${account.classifyError(error)}`; }));
document.querySelector('#sign-out').addEventListener('click', () => account.signOut().then(render).catch((error) => { message.textContent = `Sign out failed: ${account.classifyError(error)}`; }));
render();
