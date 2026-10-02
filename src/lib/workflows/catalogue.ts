export const WORKFLOW_APPS = {
  scan: { label: 'Scan', href: 'https://thiepn.dev/scan/', scope: 'device', accepts: ['application/pdf'], exports: ['application/pdf'], revision: '4fed03797cda8009a1df7d9fef2cd8cc03de6739' },
  pdf: { label: 'PDF Studio', href: 'https://thiepn.dev/pdf/', scope: 'device', accepts: ['application/pdf'], exports: ['application/pdf'], revision: '77a5af04fcee613ddf09d32d3e4aa9d70ea0a52a' },
  library: { label: 'Library', href: 'https://thiepn.dev/library/saved/', scope: 'device', accepts: ['application/pdf', 'application/epub+zip'], exports: [], revision: 'f8ccec78d2290d1b3dfde7343d5e19db32ccdf43' },
  notes: { label: 'Notes', href: 'https://thiepn.dev/notes/', scope: 'account', accepts: [], exports: ['text/markdown'], revision: 'a14d671bebe8715640c11ad5c8c5988749bfd820' },
  manuscript: { label: 'Manuscript', href: 'https://thiepn.dev/manuscript/', scope: 'device', accepts: ['text/markdown', 'text/plain'], exports: [], revision: '0e5c941756f42c6a02acef9ffd833690e1ea33b7' },
} as const;
export type WorkflowOwner = keyof typeof WORKFLOW_APPS;
export interface WorkflowStep { owner: WorkflowOwner; title: string; instruction: string; check: string; recovery: string; }
export const WORKFLOWS: readonly { id: string; title: string; description: string; keywords: string; steps: readonly WorkflowStep[] }[] = [
  { id: 'scan-read', title: 'Scan, edit and read a PDF', description: 'Keep the original scan, edit a separate PDF and import the chosen copy into Library.', keywords: 'scan paper pdf read book library', steps: [
    { owner: 'scan', title: 'Export from Scan', instruction: 'On Android, scan or choose a document. Save a PDF through Save As to a location you can find. This link opens the product page; it does not launch a scanner.', check: 'Open the exported PDF and check its pages. Keep the original in Scan.', recovery: 'If capture or export is interrupted, reopen Scan and check its document or workflow history before retrying.' },
    { owner: 'pdf', title: 'Edit the exported copy', instruction: 'Open PDF Studio, choose the exported PDF, make your changes and download the result under a distinct name.', check: 'Reopen the downloaded output and check its content before using it. Keep both versions.', recovery: 'If a download is missing, check PDF Studio and your downloads. Hub cannot tell whether the app finished.' },
    { owner: 'library', title: 'Import into Library', instruction: 'In My Library, choose EPUB or PDF and select the downloaded output. Import makes a browser-local copy.', check: 'Open the imported book in Library. It belongs to this browser and is not automatically synced by Account.', recovery: 'Check My Library before importing again. Keep the downloaded file for recovery after browser data loss.' },
  ] },
  { id: 'pdf-read', title: 'Edit a PDF for Library', description: 'Use a downloaded PDF, keep a new version and read the selected copy in Library.', keywords: 'pdf edit import library read', steps: [
    { owner: 'pdf', title: 'Edit and download', instruction: 'Choose your PDF inside PDF Studio. Download the edited result with a distinct name and keep the original.', check: 'Check the downloaded pages and content. A project checkpoint alone is not the exported PDF.', recovery: 'For an interrupted operation, use PDF Studio recovery and inspect existing outputs before exporting again.' },
    { owner: 'library', title: 'Choose the reading copy', instruction: 'In My Library, choose EPUB or PDF and select the version you want to read.', check: 'Open the imported book and verify it is the chosen version. Earlier imports and their reading progress remain separate.', recovery: 'If the wrong version was imported, keep the correct file and manage that copy in Library. Hub does not overwrite books or move progress.' },
  ] },
  { id: 'notes-draft', title: 'Turn notes into a manuscript', description: 'Export Markdown from Notes, then use its source in a separate Manuscript draft.', keywords: 'notes markdown document manuscript write publish', steps: [
    { owner: 'notes', title: 'Export selected notes', instruction: 'Select the notes in Notes and export them as Markdown. Extract the archive to obtain the Markdown files.', check: 'Review the selected text and preserve source attribution in the draft. The exported files are separate copies.', recovery: 'If export fails, return to the notes and export the intended selection again. Your originals stay in Notes.' },
    { owner: 'manuscript', title: 'Open the Markdown source', instruction: 'Open a Markdown file in Manuscript or combine the desired text in a new draft. Review the structure, then use Publish for output options.', check: 'Keep the Markdown source and any downloaded project backup. Changes in the draft do not update the original notes.', recovery: 'Reopen the saved draft or source after interruption. Hub cannot confirm publication or automatically reconstruct the export.' },
  ] },
];
export function workflowLocation(id: string, step = 0) {
  const workflow = WORKFLOWS.find(w => w.id === id); if (!workflow || !Number.isInteger(step) || step < 0 || step >= workflow.steps.length) return '/flows/';
  const params = new URLSearchParams({ flow: id, step: String(step + 1) }); return `/flows/?${params}`;
}
export function parseWorkflowLocation(search: string) {
  const p = new URLSearchParams(search), flow = WORKFLOWS.find(w => w.id === p.get('flow')) ?? WORKFLOWS[0]!;
  const raw = p.get('step') ?? '1', step = /^[1-9]\d?$/.test(raw) ? Number(raw) - 1 : 0;
  return { id: flow.id, step: step >= 0 && step < flow.steps.length ? step : 0 };
}
