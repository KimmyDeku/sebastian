"use client";
import { MessageCircle, Newspaper, UtensilsCrossed, Mail, Plane, CalendarDays, BedDouble, Compass, BarChart3, Shirt, BookOpen, ExternalLink } from "lucide-react";
import { useData } from "@/lib/store";
import { useActivity, type Activity, type ActivityKind } from "@/lib/activity";

export const KIND: Record<ActivityKind, { label: string; icon: any }> = {
  chat: { label: "Chats", icon: MessageCircle }, news: { label: "News", icon: Newspaper }, recipe: { label: "Recipes", icon: UtensilsCrossed },
  email: { label: "Email", icon: Mail }, trip: { label: "Travel", icon: Plane }, schedule: { label: "Schedule", icon: CalendarDays },
  booking: { label: "Booking", icon: BedDouble }, discover: { label: "Discover", icon: Compass }, finance: { label: "Finance", icon: BarChart3 },
  fashion: { label: "Fashion", icon: Shirt }, notebook: { label: "Notebook", icon: BookOpen }, link: { label: "Websites", icon: ExternalLink },
};

/** Chats and activity together, newest first. */
export function useHistory(): (Activity & { chatId?: string })[] {
  const d = useData();
  const activity = useActivity();
  const chats = d.chats.map((c) => ({ id: `chat_${c.id}`, chatId: c.id, at: c.updatedAt, kind: "chat" as const, title: c.title, detail: `${c.messages.length} message${c.messages.length === 1 ? "" : "s"}`, href: `/chat?id=${c.id}` }));
  return [...chats, ...activity].sort((a, b) => b.at.localeCompare(a.at));
}
