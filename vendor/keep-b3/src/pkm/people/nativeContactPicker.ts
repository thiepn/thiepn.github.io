/**
 * Privacy-Preserving Native Contact Picker Adapter for Phase P48
 * 
 * Uses browser-native `navigator.contacts.select` or mobile platform hooks.
 * Strictly adheres to privacy mandates:
 * - One-time explicit selection only
 * - Zero startup permission requests
 * - No background synchronization or full address-book harvesting
 */

import { NativeContactSelectResult } from './peopleTypes';

/**
 * Checks if the browser or runtime platform supports the native Contact Picker API
 */
export function isNativeContactPickerSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  return 'contacts' in navigator && 'ContactsManager' in window;
}

/**
 * Prompts user with native OS Contact Picker to select one or more contacts
 */
export async function pickNativeContacts(options?: {
  multiple?: boolean;
}): Promise<{
  success: boolean;
  contacts: NativeContactSelectResult[];
  error?: string;
}> {
  if (!isNativeContactPickerSupported()) {
    return {
      success: false,
      contacts: [],
      error: 'The Contact Picker API is not supported on this platform or browser.',
    };
  }

  try {
    const props = ['name', 'email', 'tel', 'address', 'icon'];
    const opts = { multiple: options?.multiple ?? true };

    const selectedList = await (navigator as any).contacts.select(props, opts);
    if (!Array.isArray(selectedList) || selectedList.length === 0) {
      return { success: true, contacts: [] };
    }

    const results: NativeContactSelectResult[] = [];

    for (const item of selectedList) {
      const rawNames: string[] = item.name || [];
      const fullName = rawNames[0] || 'Unnamed Contact';
      const emails: string[] = item.email || [];
      const phones: string[] = item.tel || [];
      const addresses: string[] = [];

      if (Array.isArray(item.address)) {
        for (const addr of item.address) {
          if (typeof addr === 'string') addresses.push(addr);
          else if (typeof addr === 'object' && addr !== null) {
            const formatted = [
              addr.addressLine,
              addr.city,
              addr.region,
              addr.postalCode,
              addr.country,
            ].filter(Boolean).join(', ');
            if (formatted) addresses.push(formatted);
          }
        }
      }

      let photoDataUrl: string | undefined;
      if (Array.isArray(item.icon) && item.icon.length > 0 && item.icon[0] instanceof Blob) {
        try {
          const blob = item.icon[0] as Blob;
          photoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch {
          // ignore photo read error
        }
      }

      results.push({
        displayName: fullName,
        emails,
        phones,
        addresses,
        photoDataUrl,
      });
    }

    return {
      success: true,
      contacts: results,
    };
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message?.includes('canceled')) {
      return { success: true, contacts: [] };
    }
    return {
      success: false,
      contacts: [],
      error: err.message || 'Failed to select contacts from native picker.',
    };
  }
}
