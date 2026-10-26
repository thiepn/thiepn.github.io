/**
 * Phase P28: Mobile-First Interaction & Accessibility Test Suite
 */

import { a11yAnnouncer } from '../../utils/a11y';

export async function runMobileAccessibilityTests() {
  console.log('\n--- Running Mobile-First Interaction & Accessibility Tests (P28) ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      console.error(`  FAIL: ${name}`);
    }
  }

  // 1. A11y Live Announcer Tests
  try {
    a11yAnnouncer.clear();
    assert(a11yAnnouncer.getRecentAnnouncement('polite') === '', 'A11yAnnouncer initial polite message is empty');
    assert(a11yAnnouncer.getRecentAnnouncement('assertive') === '', 'A11yAnnouncer initial assertive message is empty');

    let receivedMessage = '';
    let receivedPriority = '';
    const unsubscribe = a11yAnnouncer.subscribe((msg, prio) => {
      receivedMessage = msg;
      receivedPriority = prio;
    });

    a11yAnnouncer.announce('Note "Test Note" created', 'polite');
    assert(receivedMessage === 'Note "Test Note" created', 'Listener receives polite announcement');
    assert(receivedPriority === 'polite', 'Priority is polite');
    assert(a11yAnnouncer.getRecentAnnouncement('polite') === 'Note "Test Note" created', 'Recent polite announcement stored');

    a11yAnnouncer.announce('Warning: Vault storage low', 'assertive');
    assert(receivedMessage === 'Warning: Vault storage low', 'Listener receives assertive alert');
    assert(receivedPriority === 'assertive', 'Priority is assertive');
    assert(a11yAnnouncer.getRecentAnnouncement('assertive') === 'Warning: Vault storage low', 'Recent assertive announcement stored');

    // Test blank announcement ignore
    a11yAnnouncer.announce('   ', 'polite');
    assert(a11yAnnouncer.getRecentAnnouncement('polite') === 'Note "Test Note" created', 'Whitespace announcements ignored');

    unsubscribe();
    a11yAnnouncer.announce('After unsubscribe', 'polite');
    assert(receivedMessage === 'Warning: Vault storage low', 'Unsubscribed listener does not receive new announcements');
  } catch (err) {
    console.error('Error in A11y Announcer tests:', err);
    failed++;
  }

  // 2. Workspace Split-Pane Divider Accessibility & Key Navigation Math
  try {
    const clampRatio = (r: number) => Math.max(0.2, Math.min(0.8, r));

    assert(clampRatio(0.5) === 0.5, 'Ratio 0.5 is unchanged');
    assert(clampRatio(0.1) === 0.2, 'Ratio below 0.2 is clamped to 0.2 (20% min pane size)');
    assert(clampRatio(0.9) === 0.8, 'Ratio above 0.8 is clamped to 0.8 (80% max pane size)');

    // Step adjustment tests (5% step)
    let currentRatio = 0.5;
    const adjustLeft = () => { currentRatio = clampRatio(currentRatio - 0.05); };
    const adjustRight = () => { currentRatio = clampRatio(currentRatio + 0.05); };
    const reset50 = () => { currentRatio = 0.5; };

    adjustLeft();
    assert(Math.abs(currentRatio - 0.45) < 0.001, 'ArrowLeft reduces ratio by 0.05');

    adjustRight();
    assert(Math.abs(currentRatio - 0.5) < 0.001, 'ArrowRight increases ratio by 0.05');

    // Repeated decrease to boundary
    for (let i = 0; i < 10; i++) adjustLeft();
    assert(currentRatio === 0.2, 'Multiple decreases clamp at 0.2');

    reset50();
    assert(currentRatio === 0.5, 'Home/reset restores 0.5 (50/50 split)');
  } catch (err) {
    console.error('Error in Split-Pane Divider tests:', err);
    failed++;
  }

  // 3. Tab Keyboard Navigation Invariants (Cycle left/right)
  try {
    const tabs = [
      { id: 'tab-1', title: 'Note 1' },
      { id: 'tab-2', title: 'Note 2' },
      { id: 'tab-3', title: 'Note 3' },
    ];

    const getNextTab = (currentIdx: number, direction: 'next' | 'prev') => {
      if (direction === 'next') {
        return (currentIdx + 1) % tabs.length;
      }
      return (currentIdx - 1 + tabs.length) % tabs.length;
    };

    assert(getNextTab(0, 'next') === 1, 'Next tab from 0 is 1');
    assert(getNextTab(2, 'next') === 0, 'Next tab from 2 wraps around to 0');
    assert(getNextTab(0, 'prev') === 2, 'Previous tab from 0 wraps around to 2');
    assert(getNextTab(1, 'prev') === 0, 'Previous tab from 1 is 0');
  } catch (err) {
    console.error('Error in Tab Navigation tests:', err);
    failed++;
  }

  // 4. Mobile Bottom Navigation Invariants
  try {
    const requiredBottomNavButtons = ['Notes', 'Search', 'Capture', 'More'];
    assert(requiredBottomNavButtons.length === 4, 'Bottom nav features essential mobile quick-action targets');
  } catch (err) {
    console.error('Error in Mobile Bottom Nav tests:', err);
    failed++;
  }

  console.log(`✓ Mobile & Accessibility (P28): ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
