import {it,expect} from 'vitest';
import configuration from '../../src/data/reading-pilot.json';
import {validateReadingPilot,desktopReadingPilot} from '../../src/lib/reading-pilot';
it('permits only the exact device metadata pilot, including a pause',()=>{
 expect(validateReadingPilot(configuration)).toBe(true);
 expect(validateReadingPilot({...configuration,enabled:false})).toBe(false);
 for(const changed of [{cloudAccess:true},{writes:true},{scope:'account'},{operations:['search']},{desktopOnly:false},{extra:true}]) expect(()=>validateReadingPilot({...configuration,...changed})).toThrow();
});
it('excludes mobile and desktop-mode iPad browsers without excluding Windows touch laptops',()=>{
 expect(desktopReadingPilot('Firefox Windows','Win32',10)).toBe(true);
 expect(desktopReadingPilot('Chrome Android','Linux',0)).toBe(false);
 expect(desktopReadingPilot('Safari','MacIntel',5)).toBe(false);
});
