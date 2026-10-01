import { providerAction } from './registry';
import type { ProviderId } from './types';
export const PILOT_HANDOFFS: readonly { providerId: ProviderId; action: string; label: string; description: string; href: string }[] = [
  { providerId:'notes', action:'capture-text', label:'Capture a thought', description:'Open a new note; Notes handles saving', href:providerAction('notes','capture-text')! },
  { providerId:'library', action:'continue-in-app', label:'Continue in Library', description:'Library finds reading progress on this device', href:providerAction('library','continue-in-app')! },
  { providerId:'tms60', action:'open', label:'Open TMS60', description:'Choose your translation and verse in the app', href:providerAction('tms60','open')! },
];
