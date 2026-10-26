import {
  parsePDFTarget,
  formatPDFTarget,
  formatPDFCitationLink,
  generateHighlightCitationMarkdown,
  generateLiteratureNoteContent,
} from '../pdfCitation';
import { PDFAttachment, PDFAnnotation } from '../pdfTypes';

export function runPDFReaderTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(msg);
      console.error(`  FAIL: ${msg}`);
    }
  }

  // 1. Parsing and Formatting PDF Link Targets
  {
    const target1 = parsePDFTarget('pdf:paper-123#page=4');
    assert(target1 !== null, 'parsePDFTarget should parse page param');
    assert(target1?.pdfAttachmentId === 'paper-123', 'Parsed correct pdfAttachmentId');
    assert(target1?.page === 4, 'Parsed correct page');
    assert(target1?.highlightId === undefined, 'No highlightId for page-only link');

    const target2 = parsePDFTarget('pdf:attachment-999#highlight=hl-42');
    assert(target2 !== null, 'parsePDFTarget should parse highlight param');
    assert(target2?.pdfAttachmentId === 'attachment-999', 'Parsed attachment id');
    assert(target2?.highlightId === 'hl-42', 'Parsed highlight id');

    const target3 = parsePDFTarget('pdf:doc-abc#page=12&highlight=hl-777');
    assert(target3?.pdfAttachmentId === 'doc-abc', 'Parsed compound id');
    assert(target3?.page === 12, 'Parsed compound page');
    assert(target3?.highlightId === 'hl-777', 'Parsed compound highlight');

    const targetPlain = parsePDFTarget('pdf:simple-id');
    assert(targetPlain?.pdfAttachmentId === 'simple-id', 'Parsed plain pdf id');
    assert(targetPlain?.page === 1, 'Defaulted to page 1');

    const notPDF = parsePDFTarget('note-123#heading');
    assert(notPDF === null, 'Non-pdf links return null');
  }

  // 2. Round-trip formatting
  {
    const formatted1 = formatPDFTarget('doc-1', 5);
    assert(formatted1 === 'pdf:doc-1#page=5', `formatPDFTarget formatted page: ${formatted1}`);

    const formatted2 = formatPDFTarget('doc-1', 7, 'hl-1');
    assert(formatted2 === 'pdf:doc-1#page=7&highlight=hl-1', `formatPDFTarget formatted both: ${formatted2}`);

    const parsedBack = parsePDFTarget(formatted2);
    assert(parsedBack?.pdfAttachmentId === 'doc-1' && parsedBack?.page === 7 && parsedBack?.highlightId === 'hl-1', 'Round-trip target parsed cleanly');
  }

  // 3. Citation Link formatting
  {
    const linkStr = formatPDFCitationLink('paper-neuro', 'Attention Is All You Need', 3, 'hl-attn');
    assert(linkStr.includes('[[pdf:paper-neuro#page=3&highlight=hl-attn|Attention Is All You Need, p. 3]]'), `Citation link format: ${linkStr}`);
  }

  // 4. Highlight Citation Markdown Generation
  {
    const mockAnnotation: PDFAnnotation = {
      id: 'hl-sample-1',
      pdfAttachmentId: 'paper-quantum',
      page: 8,
      text: 'Quantum coherence is preserved across macroscopic thermal gradients.',
      color: 'yellow',
      createdAt: '2026-03-01T12:00:00.000Z',
      anchor: {
        pageIndex: 7,
        textExact: 'Quantum coherence is preserved across macroscopic thermal gradients.',
        textPrefix: 'In this experimental regime, ',
        textSuffix: ' indicating decoupled environmental interaction.',
        rects: [{ x: 50, y: 100, width: 300, height: 14 }],
      },
      note: 'Crucial evidence for macroscopic quantum states',
    };

    const mockPdf: PDFAttachment = {
      id: 'paper-quantum',
      name: 'Macroscopic Quantum Coherence in Thermal Gradients',
      fileName: 'quantum_2026.pdf',
      size: 1048576,
      pageCount: 24,
      createdAt: '2026-03-01T10:00:00.000Z',
    };

    const citationMd = generateHighlightCitationMarkdown(mockAnnotation, mockPdf);
    assert(citationMd.includes('> "Quantum coherence is preserved across macroscopic thermal gradients."'), 'Citation includes quoted highlight text');
    assert(citationMd.includes('[[pdf:paper-quantum#page=8&highlight=hl-sample-1|Macroscopic Quantum Coherence in Thermal Gradients, p. 8]]'), 'Citation includes deep pdf link');
    assert(citationMd.includes('**Note**: Crucial evidence for macroscopic quantum states'), 'Citation includes user annotation note');
  }

  // 5. Literature Note Generation
  {
    const mockPdf: PDFAttachment = {
      id: 'paper-deeplearning',
      name: 'Deep Residual Learning for Image Recognition',
      fileName: 'resnet.pdf',
      size: 2048576,
      pageCount: 12,
      createdAt: '2026-02-15T08:30:00.000Z',
    };

    const annotations: PDFAnnotation[] = [
      {
        id: 'hl-res-1',
        pdfAttachmentId: 'paper-deeplearning',
        page: 1,
        text: 'Deeper neural networks are more difficult to train.',
        color: 'yellow',
        createdAt: '2026-02-15T09:00:00.000Z',
        anchor: {
          pageIndex: 0,
          textExact: 'Deeper neural networks are more difficult to train.',
          textPrefix: '',
          textSuffix: '',
          rects: [],
        },
      },
      {
        id: 'hl-res-2',
        pdfAttachmentId: 'paper-deeplearning',
        page: 2,
        text: 'We explicitly reformulate the layers as learning residual functions with reference to the layer inputs.',
        color: 'green',
        createdAt: '2026-02-15T09:15:00.000Z',
        anchor: {
          pageIndex: 1,
          textExact: 'We explicitly reformulate the layers as learning residual functions with reference to the layer inputs.',
          textPrefix: '',
          textSuffix: '',
          rects: [],
        },
        note: 'Core formulation of residual skip-connections',
      },
    ];

    const litNote = generateLiteratureNoteContent(mockPdf, annotations);
    assert(litNote.includes('# Literature Note: Deep Residual Learning for Image Recognition'), 'Literature note has title');
    assert(litNote.includes('[[pdf:paper-deeplearning#page=1|Deep Residual Learning for Image Recognition (resnet.pdf)]]'), 'Literature note has main document link');
    assert(litNote.includes('### Page 1'), 'Groups by page 1');
    assert(litNote.includes('### Page 2'), 'Groups by page 2');
    assert(litNote.includes('> "Deeper neural networks are more difficult to train."'), 'Includes page 1 highlight');
    assert(litNote.includes('Core formulation of residual skip-connections'), 'Includes page 2 note');
    assert(litNote.includes('#literature-note'), 'Includes literature-note tag');
  }

  // 6. Anchor Stability & Multi-rect coordinate validation
  {
    const sampleAnchor = {
      pageIndex: 0,
      textExact: 'Test selection',
      textPrefix: 'Before ',
      textSuffix: ' after',
      rects: [
        { x: 10, y: 20, width: 100, height: 15 },
        { x: 10, y: 35, width: 80, height: 15 },
      ],
    };

    assert(sampleAnchor.rects.length === 2, 'Anchor supports multi-line bounding rectangles');
    assert(sampleAnchor.textPrefix.length > 0 && sampleAnchor.textSuffix.length > 0, 'Prefix and suffix anchor guarantees robust re-attachment');
  }

  return { passed, failed, errors };
}
