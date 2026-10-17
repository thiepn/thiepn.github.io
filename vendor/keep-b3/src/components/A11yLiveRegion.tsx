import React, { useEffect, useState } from 'react';
import { a11yAnnouncer } from '../utils/a11y';

export const A11yLiveRegion: React.FC = () => {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  useEffect(() => {
    const unsubscribe = a11yAnnouncer.subscribe((msg, priority) => {
      if (priority === 'assertive') {
        setAssertiveMessage(msg);
      } else {
        setPoliteMessage(msg);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <div className="sr-only" aria-hidden="false">
      {/* Polite live region */}
      <div
        id="a11y-live-polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {politeMessage}
      </div>

      {/* Assertive live region for critical alerts */}
      <div
        id="a11y-live-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {assertiveMessage}
      </div>
    </div>
  );
};
