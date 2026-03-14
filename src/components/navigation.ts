export type AppNavItem = {
  href: string;
  label: string;
  short: string;
  matchStartsWith?: boolean;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
  isPrimaryAction?: boolean;
};

export function getNavigationItems(isAuthenticated: boolean): AppNavItem[] {
  const commonItems: AppNavItem[] = [
    { href: '/', label: 'Home', short: 'H' },
    { href: '/discover', label: 'Explore', short: 'E', matchStartsWith: true },
    { href: '/group/create', label: 'Create', short: '+', isPrimaryAction: true, matchStartsWith: true },
  ];

  if (isAuthenticated) {
    return [
      ...commonItems,
      { href: '/profile', label: 'Profile', short: 'P', matchStartsWith: true },
    ];
  }

  return [
    ...commonItems,
    { href: '/auth', label: 'Sign in', short: 'S', matchStartsWith: true },
  ];
}

export function getBottomNavigationItems(isAuthenticated: boolean): AppNavItem[] {
  const commonItems: AppNavItem[] = [
    { href: '/', label: 'Home', short: 'H' },
    { href: '/discover', label: 'Explore', short: 'E', matchStartsWith: true },
  ];

  if (isAuthenticated) {
    return [
      ...commonItems,
      { href: '/profile', label: 'Profile', short: 'P', matchStartsWith: true },
    ];
  }

  return [
    ...commonItems,
    { href: '/auth', label: 'Sign in', short: 'S', matchStartsWith: true },
  ];
}

export function isNavItemActive(pathname: string, item: AppNavItem): boolean {
  if (item.href === '/') return pathname === '/';
  return item.matchStartsWith ? pathname.startsWith(item.href) : pathname === item.href;
}
