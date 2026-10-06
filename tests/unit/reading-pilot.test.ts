import {it,expect} from 'vitest';
import configuration from '../../src/data/reading-pilot.json';
import {validateReadingPilot,desktopReadingPilot,READING_PILOT_MOBILE_ENABLED} from '../../src/lib/reading-pilot';
it('permits only the exact device metadata pilot, including a pause',()=>{
 expect(validateReadingPilot(configuration)).toBe(true);
 expect(validateReadingPilot({...configuration,enabled:false})).toBe(false);
 for(const changed of [{cloudAccess:true},{writes:true},{scope:'account'},{operations:['search']},{desktopOnly:true},{extra:true}]) expect(()=>validateReadingPilot({...configuration,...changed})).toThrow();
});
it('enables the mobile preview while recognizing desktop-mode iPad and touch laptops',()=>{
 expect(READING_PILOT_MOBILE_ENABLED).toBe(true);
 expect(desktopReadingPilot('Firefox Windows','Win32',10)).toBe(true);
 expect(desktopReadingPilot('Chrome Android','Linux',0)).toBe(false);
 expect(desktopReadingPilot('Safari','MacIntel',5)).toBe(false);
});
