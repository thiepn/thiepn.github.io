import {
  extractNoteImages,
  removeImageFromNoteContent,
  isDataUrl,
  formatBytes,
  NoteEmbeddedImage,
} from '../images/noteImages';
import { NoteImage } from '../../types';

export function runNoteImageGalleryTests(): { passed: number; failed: number; errors: string[] } {
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

  // Gate 1: Extraction of Markdown Images
  const md1 = `
# Project Kickoff
Here is our initial concept diagram:
![System Architecture](https://images.unsplash.com/photo-arch-1)
And the mobile layout:
![Mobile Wireframe](https://images.unsplash.com/photo-wireframe-2)
  `;
  const images1 = extractNoteImages(md1);
  assert(images1.length === 2, 'Extracts exactly 2 markdown images');
  assert(images1[0].alt === 'System Architecture', 'First image has correct alt');
  assert(images1[0].url === 'https://images.unsplash.com/photo-arch-1', 'First image URL matched');
  assert(images1[0].index === 0, 'First image has index 0');
  assert(images1[1].alt === 'Mobile Wireframe', 'Second image has correct alt');
  assert(images1[1].index === 1, 'Second image has index 1');

  // Gate 2: Camera Snapshot / DataURL Detection
  const fakeCameraData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD';
  const mdCamera = `
# Meeting Notes
Live whiteboard capture from camera:
![Whiteboard Photo](${fakeCameraData})
  `;
  const imagesCamera = extractNoteImages(mdCamera);
  assert(imagesCamera.length === 1, 'Extracts camera photo embed');
  assert(imagesCamera[0].sourceType === 'camera', 'Detects sourceType as camera');
  assert(imagesCamera[0].url === fakeCameraData, 'Preserves dataUrl exactly');
  assert(isDataUrl(imagesCamera[0].url), 'isDataUrl returns true for camera photo');

  // Gate 3: HTML <img> tag extraction
  const mdHtml = `
Here is an HTML badge:
<img src="https://shields.io/badge/status-active-brightgreen" alt="Active Status Badge" />
And regular text.
  `;
  const imagesHtml = extractNoteImages(mdHtml);
  assert(imagesHtml.length === 1, 'Extracts image from HTML <img> tag');
  assert(imagesHtml[0].alt === 'Active Status Badge', 'Extracts HTML alt attribute');
  assert(imagesHtml[0].url === 'https://shields.io/badge/status-active-brightgreen', 'Extracts HTML src URL');
  assert(imagesHtml[0].sourceType === 'html', 'Sets sourceType to html');

  // Gate 4: Empty Alt Text Fallback
  const mdNoAlt = 'Check this: ![](https://example.com/anonymous.png)';
  const imagesNoAlt = extractNoteImages(mdNoAlt);
  assert(imagesNoAlt.length === 1, 'Extracts image with empty alt');
  assert(Boolean(imagesNoAlt[0].alt), 'Provides fallback alt description');
  assert(imagesNoAlt[0].url === 'https://example.com/anonymous.png', 'Extracts correct URL');

  // Gate 5: Aggregation with Note Attachment Images & Deduplication
  const attachedImages: NoteImage[] = [
    {
      id: 'att-1',
      name: 'Design Spec.png',
      dataUrl: 'https://example.com/design-spec.png',
      caption: 'Design Specification V2',
      size: 204800,
    },
    {
      id: 'att-2',
      name: 'Duplicate.png',
      dataUrl: 'https://images.unsplash.com/photo-arch-1', // duplicate of md1 first image
    },
  ];
  const aggregated = extractNoteImages(md1, attachedImages);
  assert(aggregated.length === 3, 'Aggregates markdown images and unique attachments with deduplication');
  const attachmentItem = aggregated.find((i) => i.id === 'att-1');
  assert(Boolean(attachmentItem), 'Attachment image included in aggregated list');
  assert(attachmentItem?.alt === 'Design Specification V2', 'Attachment caption used as alt');
  assert(attachmentItem?.byteSize === 204800, 'Preserves attachment byteSize');

  // Gate 6: Removing Image from Markdown Content
  const removeTarget = images1[0];
  const cleanedContent = removeImageFromNoteContent(md1, removeTarget);
  assert(!cleanedContent.includes(removeTarget.url), 'Cleaned content no longer contains target image URL');
  assert(cleanedContent.includes(images1[1].url), 'Cleaned content preserves other images intact');
  assert(cleanedContent.includes('# Project Kickoff'), 'Cleaned content preserves surrounding markdown text');

  // Gate 7: Helper Functions & Formatting
  assert(isDataUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='), 'isDataUrl returns true for PNG');
  assert(!isDataUrl('https://example.com/image.jpg'), 'isDataUrl returns false for HTTP URL');
  assert(formatBytes(512) === '512 B', 'Formats bytes');
  assert(formatBytes(1024 * 50) === '50.0 KB', 'Formats KB');
  assert(formatBytes(1024 * 1024 * 2.5) === '2.5 MB', 'Formats MB');

  // Gate 8: Empty Content Handling
  const emptyImages = extractNoteImages('');
  assert(emptyImages.length === 0, 'Empty content returns empty array');

  return { passed, failed, errors };
}
