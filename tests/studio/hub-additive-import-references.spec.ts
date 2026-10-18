import {test,expect} from '@playwright/test';
import {initialState} from '../../src/lib/workspace/model';
import {saveDecision} from '../../src/lib/workspace/decision-register';
import {saveOutcome} from '../../src/lib/workspace/outcome-board';
import {linkTaskEvent} from '../../src/lib/workspace/task-event-links';

test('Add backup preserves original task, note, decision, outcome and calendar links after rebasing',async({page})=>{
 const backup=initialState([],null);
 backup.tasks.push({id:'old-common',title:'Imported proof task',notes:'',due:'',time:'',priority:'high',completedAt:null});
 backup.notes.push({id:'old-common',title:'Imported proof notes',body:'Source-owned text',updatedAt:'2026-10-18T12:00:00Z'});
 backup.events.push({id:'old-common',title:'Imported review session',date:'2026-10-18',endDate:'2026-10-18',
  start:'2026-10-18T09:00:00Z',end:'2026-10-18T10:00:00Z',zone:'Europe/Berlin',allDay:false});
 saveDecision(backup,null,{title:'Imported approach',context:'',options:['Induction','Direct'],review:'',taskId:'old-common',noteId:'old-common'},null);
 saveOutcome(backup,null,{title:'Imported milestone',target:'',taskIds:['old-common'],trackerIds:[]},null);
 linkTaskEvent(backup,{taskId:'old-common',eventId:'old-common',role:'prepare'});
 await page.goto('/home/settings/');
 await page.locator('[data-action=import]').click();
 await page.locator('[data-workspace-dialog] input[type=file]').setInputFiles({
  name:'hub-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))
 });
 await page.getByLabel('Import mode').selectOption('new');
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-workspace-dialog]')).toContainText('Review import');
 await page.locator('[data-dialog-submit]').click();
 await page.goto('/?mode=workspace');
 await page.locator('[data-workspace-id]').last().click();
 await page.goto('/');
 await expect(page.locator('[data-today-decisions]')).toContainText('Imported approach');
 await expect(page.locator('[data-today-task-event]')).toContainText('Imported proof task');
 await expect(page.locator('[data-today-task-event]')).toContainText('Imported review session');
 await page.locator('[data-today-task-event] [data-action=context-task]').first().click();
 await expect(page.locator('[data-workspace-dialog] [data-confirmed-backlinks]')).toContainText('Imported milestone');
 await expect(page.locator('[data-workspace-dialog] [data-confirmed-backlinks]')).toContainText('Imported approach');
});
