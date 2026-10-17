// Run after compiling src/components/home/keepTodayModel.ts to CommonJS.
const assert = require('node:assert/strict');
const { selectKeepToday, dateOnlyLocal } = require(process.argv[2]);
const note = (id, patch={}) => ({
  id, title:`Note ${id}`, content:'',type:'text', checklist:[],color:'default', tags:[],
  folderId:null,pinned:false,archived:false,trashed:false,
  createdAt:'2026-10-01T09:00:00.000Z',updatedAt:'2026-10-16T09:00:00.000Z',reminderDate:null,images:[],...patch,
});
const notes = [
  note('p', {pinned:true,content:'- [ ] Pay by today @due(2026-10-16)'}),
  note('later',{content:'- [ ] Not due @due(2026-10-20)',reminderDate:'2026-10-18T08:00:00.000Z'}),
  note('undated',{content:'- [ ] No due date'}),
  note('done',{content:'- [x] Completed @due(2026-10-16)'}),
  note('trashed',{pinned:true,trashed:true,content:'- [ ] Private @due(2026-10-16)'}),
  note('archived',{pinned:true,archived:true,content:'- [ ] Old @due(2026-10-16)'}),
  note('locked',{pinned:true,isLocked:true,content:'- [ ] Secret @due(2026-10-16)'}),
];
const result = selectKeepToday(notes, new Date('2026-10-16T12:00:00.000Z'));
assert.equal(result.dateOnly,'2026-10-16');
assert.deepEqual(result.pinnedNotes.map(n=>n.id), ['p']);
assert.equal(result.openNoteTaskCount,3);
assert.deepEqual(result.dueNoteTasks.map(t=>t.noteId), ['p']);
assert.deepEqual(result.upcomingNoteReminders.map(n=>n.id), ['later']);
assert(!result.recentNotes.some(n=>['trashed','archived','locked'].includes(n.id)));
assert.equal(dateOnlyLocal(new Date('2026-10-16T12:00:00.000Z')),'2026-10-16');
const current = selectKeepToday([], new Date('2026-10-16T12:00:00Z'));
assert.equal(current.openNoteTaskCount,0);
assert.equal(current.dueNoteTasks.length,0);
console.log('KEEP_TODAY_MODEL_PASS (8 assertions)');
if (process.env.TZ === 'America/Los_Angeles') {
  assert.equal(dateOnlyLocal(new Date('2026-10-17T00:30:00Z')), '2026-10-16');
  console.log('KEEP_LOCAL_DAY_BOUNDARY_PASS');
}
