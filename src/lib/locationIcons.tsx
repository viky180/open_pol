import React from 'react';
import {
  Flag,
  Landmark,
  Building,
  Building2,
  Home,
  Wheat,
  MapPin,
  type LucideProps,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Flag,
  Landmark,
  Building,
  Building2,
  Home,
  Wheat,
  MapPin,
};

/**
 * Renders a Lucide icon by its name string (as stored in LOCATION_SCOPE_LEVELS).
 * Falls back to MapPin if the name is not found.
 */
export function LocationScopeIcon({
  iconName,
  className = 'w-4 h-4',
  ...props
}: { iconName: string; className?: string } & Omit<LucideProps, 'ref'>) {
  const IconComponent = ICON_MAP[iconName] ?? MapPin;
  return <IconComponent className={className} {...props} />;
}
