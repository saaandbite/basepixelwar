import { Wallet, Gamepad2, Trophy } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const steps = [
  {
    icon: <Wallet className="w-8 h-8 md:w-10 md:h-10 text-white" />,
    title: "Connect & Uplink",
    description: "Link your wallet to Base L2. No registration required. Instant access to the battlefield."
  },
  {
    icon: <Gamepad2 className="w-8 h-8 md:w-10 md:h-10 text-white" />,
    title: "Select & Conquer",
    description: "Choose your arena: 1v1 Wagers for quick ETH or Weekly Tournaments for high-stakes glory."
  },
  {
    icon: <Trophy className="w-8 h-8 md:w-10 md:h-10 text-white" />,
    title: "Dominate & Earn",
    description: "Defeat opponents, climb the leaderboard, and claim your instant ETH payouts and NFT trophies."
  }
];

export default function HowItWorks() {
  return (
    <section className="relative z-10 py-20 bg-[#903749] -mt-1">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>

      <div className="container mx-auto px-4 relative z-10">

        {/* Tech/HUD Section Header */}
        <ScrollReveal className="flex items-center justify-center gap-4 mb-20">
          <div className="h-px bg-white/30 w-12 md:w-24"></div>
          <div className="w-2 h-2 bg-white"></div>
          <h2 className="text-3xl md:text-5xl font-retro text-center text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)]">
            SYSTEM PROTOCOL
          </h2>
          <div className="w-2 h-2 bg-white"></div>
          <div className="h-px bg-white/30 w-12 md:w-24"></div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">

          {steps.map((step, index) => (
            <ScrollReveal key={index} direction="up" delay={index * 200} className="flex flex-col items-center text-center relative w-full group">

              {/* Desktop Connector (Between Cards) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-20 -right-6 md:-right-12 w-6 md:w-12 h-px border-t-2 border-dashed border-white/30 z-0"></div>
              )}

              {/* Step Card */}
              <div className="relative w-full bg-white/5 border border-white/10 p-8 pt-12 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">

                {/* Corner Brackets */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/50 group-hover:border-white transition-colors"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/20 group-hover:border-[#ff8ba7] transition-colors"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/20 group-hover:border-[#ff8ba7] transition-colors"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/50 group-hover:border-white transition-colors"></div>

                {/* Step Number Label */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#903749] text-white font-retro text-sm px-4 py-1 border border-white shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
                  STEP 0{index + 1}
                </div>

                {/* Icon Container (Skewed) */}
                <div className="relative w-16 h-16 mb-6 mx-auto">
                  <div className="absolute inset-0 border border-white/30 skew-x-6 group-hover:skew-x-0 transition-transform duration-300"></div>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-white/10 transition-colors duration-300"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {step.icon}
                  </div>
                </div>

                <h3 className="font-retro text-xl mb-4 text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)] group-hover:text-[#ffc6c7] transition-colors">
                  {step.title}
                </h3>
                <p className="font-terminal text-base text-white/90 leading-relaxed drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
                  {step.description}
                </p>

              </div>

            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
