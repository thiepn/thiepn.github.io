// Pure source-release check. An unavailable archive record is not an active
// application launch and cannot be used to waive a Hub launch health check.
export function auditProjectLaunchAvailability(project, source, activeLaunchIds) {
  const errors = [];
  if (!source || source.visibility !== 'listed' || source.code !== project.code || source.slug !== project.slug) {
    errors.push('catalogue record has no matching listed source');
    return errors;
  }
  if (project.unavailable !== undefined && typeof project.unavailable !== 'boolean')
    errors.push('invalid availability flag');
  const unavailable = project.unavailable === true;
  if (unavailable !== (source.unavailable === true))
    errors.push('catalogue availability differs from source');
  if (unavailable) {
    if (activeLaunchIds.has(project.slug)) errors.push('active Hub launch cannot be unavailable');
    if (project.liveUrl !== null || source.liveUrl != null)
      errors.push('unavailable archive record must not advertise a launch URL');
  } else {
    try {
      const url = new URL(project.liveUrl);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('unsafe URL');
    } catch {
      errors.push('live URL must use HTTPS without credentials');
    }
    if (project.liveUrl !== source.liveUrl) errors.push('live URL differs from source');
  }
  return errors;
}
