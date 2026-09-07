from pathlib import Path
p=Path('scripts/capture-showcase-media.mjs');s=p.read_text()
s=s.replace("'-t','6'", "'-t','2'")
a=s.index("  await page.waitForTimeout(700);\n  row.videoStart")
b=s.index("\n},{slug:'micro-arcade',file:'showcase-breakout'",a)
s=s[:a]+"  row.videoStart=(Date.now()-began)/1000;\n  await page.waitForTimeout(250);"+s[b:]
s=s.replace("await page.getByRole('button',{name:'Start Writing',exact:true}).click();await page.waitForTimeout(1500);", "await page.getByRole('button',{name:'Start Writing',exact:true}).click();await page.waitForTimeout(600);\n  const blank=page.locator('[data-action=onboarding-blank]');if(await blank.isVisible())await blank.click();\n  await page.waitForFunction(()=>document.documentElement.dataset.screen==='editor');\n  const split=page.locator('[data-workspace=split]');if(await split.count())await split.click();\n  await page.waitForTimeout(700);")
s=s.replace("await page.getByRole('button',{name:'START',exact:true}).click();await page.waitForTimeout(1200);", "await page.getByRole('button',{name:'START',exact:true}).click();await page.waitForTimeout(400);\n  await page.locator('button:visible').filter({hasText:/ENDLESS/}).first().click();await page.waitForTimeout(800);")
s=s.replace("const quick=page.getByRole('button',{name:'Quick Play',exact:true}).filter({visible:true}).first();", "const quick=page.locator('button:visible').filter({hasText:/^Quick Play$/}).first();")
p.write_text(s)
