import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';

test('all generators retain exact-source binary patches without write credentials', () => {
  const profiles = {
  "brand-icons.yml": "brand-icons",
  "capture-hub-media.yml": "capture-hub-media",
  "capture-previews.yml": "capture-previews",
  "capture-project-media.yml": "capture-project-media",
  "og-assets.yml": "og-assets",
  "refresh-generated.yml": "refresh-generated"
};
  for (const [name, profile] of Object.entries(profiles)) {
    const src = readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');
    const workflow = YAML.parse(src);
    assert.deepEqual(workflow.permissions, { contents: 'read' }, name);
    assert.doesNotMatch(src, /git push|git commit|gh workflow run|secrets\.|deploy-pages/, name);
    for (const job of Object.values(workflow.jobs)) {
      assert.ok(job.if.includes("github.ref == 'refs/heads/main'"), name);
      assert.equal(job.permissions, undefined);
      const checkout = job.steps.find(s => s.uses?.startsWith('actions/checkout@'));
      assert.equal(checkout.with['persist-credentials'], false, name);
      if (checkout.with.ref) assert.equal(checkout.with.ref, '${{ github.sha }}');
      assert.ok(job.steps.some(s => s.run === 'node scripts/prepare-generated-review.mjs ' + profile));
      const upload = job.steps.find(s => s.with?.name === 'generated-review-' + profile);
      assert.ok(upload?.uses.startsWith('actions/upload-artifact@'));
      assert.equal(upload.with.path, '.cache/generated-review/' + profile + '/');
      assert.equal(upload.with['if-no-files-found'], 'error');
      assert.equal(upload.with['include-hidden-files'], true);
    }
  }
});
