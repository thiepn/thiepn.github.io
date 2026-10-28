import { parseInlineMarkdown } from '../PKMPreviewRenderer';
import { filterSlashCommands } from '../editor/slashCommands';

export function runImageEmbeddingTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      const err = `[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`;
      errors.push(err);
      console.error(err);
    }
  }

  // Gate 1: Parsing Standard Markdown Images
  const mdSimple = 'Here is a photo: ![Architecture Diagram](https://example.com/diagram.png) in note.';
  const segsSimple = parseInlineMarkdown(mdSimple);
  const imgSeg = segsSimple.find((s) => s.type === 'image');
  assert(Boolean(imgSeg), 'Finds image segment in inline markdown');
  assert(imgSeg?.content === 'Architecture Diagram', 'Extracts correct alt description');
  assert(imgSeg?.url === 'https://example.com/diagram.png', 'Extracts correct image URL');

  // Gate 2: Camera Photo DataURL Embeds
  const fakeDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD';
  const mdCamera = `![Live Camera Photo](${fakeDataUrl})`;
  const segsCamera = parseInlineMarkdown(mdCamera);
  assert(segsCamera.length === 1, 'Single image line parses to 1 segment');
  assert(segsCamera[0].type === 'image', 'Parsed segment type is image');
  assert(segsCamera[0].content === 'Live Camera Photo', 'Camera photo alt text preserved');
  assert(segsCamera[0].url === fakeDataUrl, 'Camera photo base64 dataUrl preserved');

  // Gate 3: Multiple Images Mixed with Formatting
  const mdMixed =
    'Look at ![First](https://img.com/1.jpg) and **bold text** with another ![Second](https://img.com/2.png).';
  const segsMixed = parseInlineMarkdown(mdMixed);
  const images = segsMixed.filter((s) => s.type === 'image');
  assert(images.length === 2, 'Extracts both images from mixed text');
  assert(images[0].content === 'First' && images[1].content === 'Second', 'Both alt labels correct');

  // Gate 4: Empty Alt Text Support
  const mdNoAlt = '![](https://example.com/blank-alt.webp)';
  const segsNoAlt = parseInlineMarkdown(mdNoAlt);
  assert(segsNoAlt.length === 1 && segsNoAlt[0].type === 'image', 'Image with empty alt text supported');
  assert(segsNoAlt[0].url === 'https://example.com/blank-alt.webp', 'URL extracted for empty alt');

  // Gate 5: Slash Commands Integration
  const imgCmds = filterSlashCommands('image');
  assert(imgCmds.some((c) => c.id === 'image'), 'Slash command menu includes /image command');
  const camCmds = filterSlashCommands('camera');
  assert(camCmds.some((c) => c.id === 'camera'), 'Slash command menu includes /camera command');

  // Gate 6: Direct Image URL Regex Detection
  const isDirectImageUrl = (text: string) =>
    /^https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg|avif|bmp)(?:\?[^\s]*)?$/i.test(text.trim()) ||
    /^data:image\/[a-zA-Z0-9+.-]+;base64,[^\s]+$/i.test(text.trim());

  assert(isDirectImageUrl('https://cdn.site.com/photo.jpg'), 'Detects .jpg as direct image URL');
  assert(isDirectImageUrl('https://cdn.site.com/photo.png?w=800'), 'Detects .png with query params');
  assert(isDirectImageUrl('https://cdn.site.com/vector.svg'), 'Detects .svg as direct image URL');
  assert(isDirectImageUrl(fakeDataUrl), 'Detects data:image base64 as direct image URL');
  assert(!isDirectImageUrl('https://example.com/not-an-image.html'), 'Rejects non-image HTML URL');
  assert(!isDirectImageUrl('Just some random text'), 'Rejects normal text');

  return { passed, failed, errors };
}
