import { BadgeCheck, CalendarClock, Thermometer, Truck } from "lucide-react";

const items = [
  { icon: BadgeCheck, title: "100% Authentic", text: "Sourced from authorised distributors only" },
  { icon: CalendarClock, title: "Batch & expiry shown", text: "On every product, before you buy" },
  { icon: Thermometer, title: "Climate-controlled", text: "Stored at 18–22°C in Colombo" },
  { icon: Truck, title: "Same-day Colombo", text: "Island-wide delivery in 1–5 days" },
];

export function TrustBar({ compact }: { compact?: boolean }) {
  return (
    <div className={compact ? "grid grid-cols-2 gap-4" : "grid grid-cols-2 gap-y-8 border-y border-ink/10 py-10 md:grid-cols-4"}>
      {items.map(({ icon: Icon, title, text }) => (
        <div key={title} className="flex flex-col items-center gap-2 px-3 text-center">
          <Icon strokeWidth={1} className="h-7 w-7 text-stone-600" />
          <p className="font-serif text-lg leading-tight">{title}</p>
          <p className="text-xs text-ink-500">{text}</p>
        </div>
      ))}
    </div>
  );
}
