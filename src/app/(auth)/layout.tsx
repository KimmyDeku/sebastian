"use client";
import { usePathname } from "next/navigation";
import { Img } from "@/components/ui/Img";
import { Wordmark } from "@/components/SebastianMark";

// One image per page. Login keeps the concierge hero; signup gets the welcome image.
const HERO = {
  login: {
    src: "/images/sebastian-butler-concierge-hero.png",
    alt: "Sebastian, a refined butler concierge, ready to assist",
  },
  signup: {
    src: "/images/sebastian-butler-welcome-home-ai.png",
    alt: "Sebastian the butler welcoming you home",
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const hero = path.startsWith("/signup") ? HERO.signup : HERO.login;

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden lg:block">
        <Img key={hero.src} src={hero.src} alt={hero.alt} className="absolute inset-0 w-full h-full object-center" />
        <div className="absolute inset-0 card-scrim" />
        <div className="relative h-full flex flex-col justify-end p-14 text-white max-w-xl">
          <p className="font-serif text-5xl leading-[1.05]">At your service, whenever you need.</p>
          <p className="mt-4 text-white/85">Recipes, travel, bookings, finances and more, handled with a butler&apos;s composure.</p>
        </div>
      </div>
      <div className="flex flex-col px-6 sm:px-12 py-10">
        <Wordmark />
        <div className="flex-1 flex items-center"><div className="w-full max-w-md mx-auto py-10">{children}</div></div>
        <p className="text-[11.5px] text-muted-soft text-center">Sebastian can make mistakes, so double-check important information.</p>
      </div>
    </div>
  );
}