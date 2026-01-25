import { Wallet, Gamepad2, Trophy } from "lucide-react";

const steps = [
  {
    icon: <Wallet className="w-12 h-12 text-[#903749]" />,
    title: "Connect Wallet",
    description: "Link your wallet to get started. No registration required."
  },
  {
    icon: <Gamepad2 className="w-12 h-12 text-[#903749]" />,
    title: "Join Battle",
    description: "Enter a room and start placing pixels to claim territory."
  },
  {
    icon: <Trophy className="w-12 h-12 text-[#903749]" />,
    title: "Win Rewards",
    description: "Dominate the map and claim your winnings instantly."
  }
];

export default function HowItWorks() {
  return (
    <section className="relative z-10 py-20 bg-[#fce4ec] text-[#903749]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-5xl font-retro text-center mb-16 drop-shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
          How It Works
        </h2>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 relative">
          
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-2 bg-[#ff8ba7] -z-10 transform -translate-y-[60%]"></div>

          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center relative z-10 max-w-xs">
              <div className="w-24 h-24 bg-white border-4 border-[#903749] rounded-full flex items-center justify-center mb-6 shadow-[6px_6px_0_#ff8ba7]">
                {step.icon}
              </div>
              <h3 className="font-retro text-2xl mb-2">{step.title}</h3>
              <p className="font-terminal text-xl text-[#c44569]">{step.description}</p>
              
              <div className="absolute -top-4 -right-4 bg-[#ff8ba7] text-white font-retro w-8 h-8 flex items-center justify-center rounded-full border-2 border-white">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
