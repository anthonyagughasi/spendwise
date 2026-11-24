import {
  Utensils,
  Car,
  Home,
  Zap,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  Film,
  Repeat,
  Plane,
  Sparkles,
  Briefcase,
  Laptop,
  Building2,
  TrendingUp,
  Gift,
  CircleDollarSign,
  Wallet,
  CreditCard,
  Receipt,
  Shield,
  Coffee,
  CircleDot,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Utensils,
  Car,
  Home,
  Zap,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  Film,
  Repeat,
  Plane,
  Sparkles,
  Briefcase,
  Laptop,
  Building2,
  TrendingUp,
  Gift,
  CircleDollarSign,
  Wallet,
  CreditCard,
  Receipt,
  Shield,
  Coffee,
  CircleDot,
};

export function CategoryIcon({
  name,
  color,
  size = 16,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  const Icon = ICON_MAP[name] ?? CircleDot;
  return <Icon size={size} style={color ? { color } : undefined} aria-hidden="true" />;
}
