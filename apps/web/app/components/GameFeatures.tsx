import { Zap, Trophy, Swords, Coins } from "lucide-react";

const features = [
  {
    icon: <Swords className="w-8 h-8 md:w-10 md:h-10 text-white" />,
    title: "Real-Time PvP",
    description: "Battle against players worldwide in intense pixel warfare. Capture territory and defend your ground."
  },
  {
    icon: <Zap className="w-8 h-8 md:w-10 md:h-10 text-white" />,
    title: "Instant Settlement",
    description: "Powered by Base L2. Experience low fees and instant on-chain transaction finality."
  },
  {
    icon: <Trophy className="w-8 h-8 md:w-10 md:h-10 text-white" />,
    title: "Weekly Tournaments",
    description: "Compete in high-stakes tournaments. Climb the leaderboard and win massive prize pools."
  },
  {
    icon: <Coins className="w-8 h-8 md:w-10 md:h-10 text-white" />,
    title: "Play to Earn",
    description: "Every pixel conquered is a step towards victory. Earn rewards for your strategic dominance."
  }
];

export default function GameFeatures() {
  return (
    <section className="relative z-10 py-20 bg-gradient-to-b from-[#ff8ba7] to-[#903749] -mt-1">
      <div className="container mx-auto px-4">
        {/* Tech/HUD About Section */}
        <div className="relative mb-32 pt-10">
          {/* Label */}
          <div className="absolute -top-6 left-0 text-sm font-retro text-white tracking-widest opacity-80 pl-2">
            ABOUT US
          </div>

          {/* HUD Container */}
          <div className="relative border-t border-l border-white/30 p-8 md:p-12">
            {/* Top Right Decorative Structure */}
            <div className="absolute top-0 right-0 w-1/3 h-1 border-t border-white/60"></div>
            <div className="absolute top-0 right-[33%] w-8 h-8 border-r border-t border-white/30 skew-x-12 origin-top-right transform translate-x-4"></div>

            {/* Pixel Accents - Top Right */}
            <div className="absolute -top-3 -right-3 flex gap-1">
              <div className="w-6 h-6 bg-[#903749] border border-white/50"></div>
              <div className="w-6 h-6 bg-[#903749] border border-white/50 translate-y-6"></div>
              <div className="w-6 h-6 bg-[var(--pixel-accent)] opacity-50 border border-white/50 translate-x-6"></div>
            </div>

            {/* Pixel Accents - Bottom Left */}
            <div className="absolute -bottom-3 -left-3 flex gap-1">
              <div className="w-8 h-8 bg-[#ff8ba7] border border-white"></div>
              <div className="w-6 h-6 bg-[#903749] border border-white -ml-2 mb-6"></div>
            </div>

            {/* Bottom Border with Gap */}
            <div className="absolute bottom-0 left-8 right-0 h-px bg-white/30 w-2/3"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-white/30"></div>

            <div className="relative z-10">
              <h3 className="text-3xl md:text-5xl font-retro text-white mb-10 text-center tracking-wide drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
                WHERE PIXELS MEET WARFARE
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 font-terminal text-base md:text-lg text-white/90 leading-relaxed text-justify">
                <p>
                  We are the architects of a new digital battlefield. Driven by the speed of Base L2 and the nostalgia of 8-bit eras.
                  Pixel War is not just a game; it's a real-time territory control experiment where every pixel represents sovereignty.
                </p>
                <div className="relative">
                  <span className="hidden md:block absolute -left-8 top-2 w-2 h-2 bg-white rounded-full"></span>
                  <p>
                    Our robust on-chain engine ensures that every capture, defense, and victory is immutable.
                    We turn static blockchain data into a playable, interactive reality that captivates strategists and gamers alike.
                  </p>
                </div>
              </div>
            </div>

            {/* Connectors/Stats Aesthetic (Static for now) */}
            <div className="absolute bottom-10 right-0 translate-x-1/2 flex flex-col gap-4 hidden lg:flex">
              <div className="text-right">
                <span className="block text-4xl font-retro text-white">10k+</span>
                <span className="text-xs font-sans text-white/70">PIXELS</span>
              </div>
              <div className="text-right">
                <span className="block text-4xl font-retro text-white">L2</span>
                <span className="text-xs font-sans text-white/70">POWERED</span>
              </div>
            </div>

          </div>
        </div>

        <h2 className="text-3xl md:text-5xl font-retro text-center mb-16 text-white drop-shadow-[6px_6px_0_rgba(0,0,0,0.3)]">
          Game Features
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white/10 border-2 border-white rounded-xl p-6 shadow-[8px_8px_0_rgba(0,0,0,0.25)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0_rgba(0,0,0,0.25)] transition-all duration-200 group"
            >
              <div className="bg-[#903749] w-14 h-14 flex items-center justify-center border-2 border-white rounded-lg mb-4 shadow-[4px_4px_0_rgba(0,0,0,0.2)] group-hover:scale-105 transition-transform duration-200">
                {feature.icon}
              </div>
              <h3 className="font-retro text-xl mb-3 text-left text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">{feature.title}</h3>
              <p className="font-terminal text-base text-white/90 leading-relaxed text-left drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section >
  );
}
