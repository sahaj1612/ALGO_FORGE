export function getInitialsAvatar(user) {
  const initials = (user?.name || user?.email || 'User')
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') || 'U';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#5c1420"/><circle cx="60" cy="60" r="54" fill="#c83743"/><text x="60" y="72" text-anchor="middle" fill="#f7f2f2" font-family="Arial,sans-serif" font-size="40" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function getUserAvatar(user) {
  return user?.picture || user?.photoURL || user?.avatarUrl || getInitialsAvatar(user);
}
