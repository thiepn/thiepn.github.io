import type { FolioDeviceSnapshot } from './folio-device';
import {getFaithTmsDue} from './faith-source-session';
import {buildFaithReviewSignals} from './faith-weekly';
import type { AppShortcut } from './types';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

/**
 * Read-only Hub presentation. Source progress is displayed ONLY from an
 * already consented Folio owner snapshot, never inferred from tasks or app opens.
 * TMS60 and devotional state remain unconnected until their original grants
 * and dedicated source projections are actually available.
 */
export function renderFaithDiscipline(
  folio: FolioDeviceSnapshot | null,
  apps: readonly AppShortcut[],
): string {
  const mdd = apps.find(app => /^(my-daily-devotion|daily-devotion|mdd)$/.test(app.id));
  const mddLink = mdd ? `<a href="${esc(mdd.url)}">Open original devotional journal</a>
    <button type="button" data-fd1-mdd-connect data-fd1-mdd-url="${esc(mdd.url)}">Request an explicitly approved one-time MDD summary</button>` :
    '<span>Devotional journal: no reviewed Hub launch available</span>';
  const tms=getFaithTmsDue();
  const review=buildFaithReviewSignals({folio,mdd:null,tms});
  const rhythms = folio?.habits.slice(0, 6) ?? [];
  const rows = rhythms.map(h =>
    `<li><span><strong>${esc(h.title)}</strong><small>Folio · ${h.status === 'completed' ? 'recorded' : h.status === 'skipped' ? 'rest day' : 'open'} · ${h.value}/${h.target}</small></span></li>`).join('');
  return `<section class="ws-faith-discipline ws-surface" data-faith-discipline aria-labelledby="faith-discipline-title">
    <header><h2 id="faith-discipline-title">Faith &amp; discipline</h2>
      <p>Practice, not performance. Every recorded status belongs to its original app.</p></header>
    <div class="ws-faith-grid">
      <section aria-label="Consented Folio practices"><h3>Practices</h3>
        ${folio ? '<p>Current explicitly shared Folio habits (not automatically classified as spiritual).</p>'+
          (rows ? '<ul>'+rows+'</ul>':'<p>No habits in this source snapshot.</p>') :
          '<p>No Folio data shared with this tab. Private practice progress is unavailable.</p>'}
        <a href="/folio/?view=habits">Open Folio habits</a>
      </section>
      <section aria-label="Scripture and reflection"><h3>Scripture &amp; reflection</h3>
        <p data-fd1-mdd role="status">My Daily Devotion owns reading and reflection records; no device-only summary has been shared in this tab.</p>
        ${mddLink}
        <p data-fd1-tms role="status">${tms ? `TMS60 authorized summary: ${tms.dueTaskCount} review tasks across ${tms.dueVerseCount} due verses · ${tms.newVerseCount} new verses (observed ${esc(tms.observedAt)}).` : 'TMS60 progress is unavailable until the original TMS60 Hub summary is authorized and opened.'}</p>
        <a href="https://tms60.thiepn.dev/">Open TMS60</a>
      </section>
      <section aria-label="Intentional focus"><h3>Focus &amp; weekly review</h3>
        <p>Choose one responsibility. Hub's Focus timer is temporary; Folio owns saved focus sessions.</p>
        <a href="/home/?mode=focus">Focus on one Hub task</a>
        <a href="/folio/?view=habits">Review original practice history</a>
      </section>
    </div>
    <section aria-label="Weekly source review" data-fd1-review>
      <h3>Review the week without inventing results</h3>
      <p>These are only current authorized observations, not seven days of history. Full practice history remains with Folio; reflection content remains private in MDD.</p>
      <ul>${review.map(signal=>`<li data-fd1-review-${signal.source}><strong>${signal.source==='tms60'?'TMS60':signal.source==='mdd'?'My Daily Devotion':'Folio'}</strong>: ${esc(signal.detail)}</li>`).join('')}</ul>
      <p>Reflect: What displaced my priorities? What helped me follow through? What one boundary should change next week?</p>
    </section>
    <p class="ws-muted">No device-wide app blocking, automatic completion, hidden cloud reads, or holiness scoring.</p>
  </section>`;
}
