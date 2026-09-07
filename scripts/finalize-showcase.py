from pathlib import Path
p=Path('src/components/studio/MediaDeck.astro')
s=p.read_text().replace('data-src={slide.video}', 'data-video-url={slide.video}').replace('class="sr-only" data-media-status', 'class="media-deck__status" data-media-status')
p.write_text(s)
p=Path('src/scripts/media-deck.ts');p.write_text(p.read_text().replace('video.dataset.src!', 'video.dataset.videoUrl!'))
p=Path('src/styles/showcase.css');s=p.read_text()
if '.media-deck__status:empty' not in s:
    s+='\n.media-deck__status { padding: 12px 20px; color: #e6eddf; font-size: .8125rem; line-height: 1.5; border-top: 1px solid #28323b; }\n.media-deck__status:empty { display: none; }\n'
p.write_text(s)
p=Path('tests/studio/studio.spec.ts');s=p.read_text()
if "recording plays only on request" not in s:
    s+='''
test('recording plays only on request and stops when changing panels',async({page})=>{
 await page.goto('/');await expect(page.locator('[data-media-deck]')).toHaveAttribute('data-ready','true');
 const video=page.locator('[data-demo-video]');
 await expect(video).toHaveJSProperty('paused',true);
 await video.evaluate((v:HTMLVideoElement)=>v.addEventListener('playing',()=>v.dataset.didPlay='true'));
 await page.getByRole('button',{name:/Watch gameplay/}).click();
 await expect(video).toHaveAttribute('data-did-play','true',{timeout:10000});
 await page.getByRole('tab',{name:'Block Drop',exact:true}).click();
 await expect(video).toHaveJSProperty('paused',true);await expect(video).not.toBeVisible();
});
'''
p.write_text(s)
p=Path('README.md');s=p.read_text()
if '## Interactive showcase' not in s:
    s+='\n## Interactive showcase\n\nTiny Tools has a dedicated homepage feature, four direct task routes, a local whitespace-cleaner miniature and a complete project page. Micro Arcade uses genuine, keyboard-operable game previews with an opt-in recording. Source-linked build notes document three projects without invented outcomes or contribution claims. See [showcase maintenance and verification](docs/showcase/README.md) for content, media and lifecycle contracts.\n'
p.write_text(s)
print('Deferred-video and visible-feedback corrections applied.')
