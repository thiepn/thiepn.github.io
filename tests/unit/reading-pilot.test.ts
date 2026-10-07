import {it,expect} from 'vitest';
import configuration from '../../src/data/reading-pilot.json';
import {validateReadingPilot,desktopReadingPilot,READING_PILOT_MOBILE_ENABLED} from '../../src/lib/reading-pilot';

it('permits the exact P4 read-only device + Account Library profile',()=>{
  expect(validateReadingPilot(configuration)).toBe(true);
  expect(validateReadingPilot({...configuration,enabled:false})).toBe(false);
  for(const changed of [
    {cloudAccess:false},
    {writes:true},
    {scope:'account'},
    {scope:'device'},
    {operations:['search']},
    {desktopOnly:true},
    {pilotId:'H23-library-reading-v1'},
    {extra:true},
  ]) expect(()=>validateReadingPilot({...configuration,...changed})).toThrow();
});

it('retains the historical H23 device-only shape as a rollback-compatible validator input',()=>{
  expect(validateReadingPilot({
    schemaVersion:1,
    pilotId:'H23-library-reading-v1',
    enabled:true,
    scope:'device',
    operations:['summary','continue'],
    desktopOnly:false,
    cloudAccess:false,
    writes:false,
  })).toBe(true);
});

it('enables the mobile preview while recognizing desktop-mode iPad and touch laptops',()=>{
  expect(READING_PILOT_MOBILE_ENABLED).toBe(true);
  expect(desktopReadingPilot('Firefox Windows','Win32',10)).toBe(true);
  expect(desktopReadingPilot('Chrome Android','Linux',0)).toBe(false);
  expect(desktopReadingPilot('Safari','MacIntel',5)).toBe(false);
});
