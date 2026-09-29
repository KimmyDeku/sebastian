import { Home, Newspaper, CalendarDays, Settings, UtensilsCrossed, BedDouble, Plane, Compass, BarChart3, Shirt, MessageCircle, BookOpen } from "lucide-react";

export const SUITES = [
  { key: "recipes", label: "Recipes", href: "/recipes", icon: UtensilsCrossed },
  { key: "booking", label: "Booking", href: "/booking", icon: BedDouble },
  { key: "travel", label: "Travel", href: "/travel", icon: Plane },
  { key: "discover", label: "Discover services", short: "Discover", href: "/discover", icon: Compass },
  { key: "schedule", label: "Scheduling", short: "Schedule", href: "/schedule", icon: CalendarDays },
  { key: "finance", label: "Finance", href: "/finance", icon: BarChart3 },
  { key: "fashion", label: "Fashion", href: "/fashion", icon: Shirt },
  { key: "news", label: "News", href: "/news", icon: Newspaper },
];

export const PRIMARY = [
  { label: "Home", href: "/", icon: Home },
  { label: "News", href: "/news", icon: Newspaper },
  { label: "Your schedule", href: "/schedule", icon: CalendarDays, badge: "schedule" as const },
  { label: "Notebook", href: "/notebook", icon: BookOpen },
];

export const MOBILE = [
  { label: "Home", href: "/", icon: Home },
  { label: "Chat", href: "/chat", icon: MessageCircle },
  { label: "Schedule", href: "/schedule", icon: CalendarDays },
  { label: "Discover", href: "/discover", icon: Compass },
];
