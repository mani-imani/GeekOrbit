// GeekOrbit — hash router: #/name?key=value. Filters live in the hash so views can be linked and reloaded.

export function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [name, query = ''] = raw.split('?');
  return { name: name || 'dashboard', params: Object.fromEntries(new URLSearchParams(query)) };
}

export function hashFor(name, params = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null && v !== false)).toString();
  return `#/${name}${q ? `?${q}` : ''}`;
}

/** Change the filters without a new history entry and without re-rendering the whole view. */
export function replaceParams(name, params) {
  history.replaceState(null, '', hashFor(name, params));
}
