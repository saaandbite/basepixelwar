import Link from 'next/link';
import { Github, Twitter } from 'lucide-react';
import ScrollReveal from "./ScrollReveal";

export default function Footer() {
  return (
    <footer className="relative z-10 bg-[#5c1a26] text-white py-12 border-t-8 border-[#903749]">
      <ScrollReveal className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">

          {/* Brand */}
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
              <span className="text-2xl font-black font-retro text-[#FFC6C7]">PIXEL</span>
              <span className="text-2xl font-black font-retro text-white">WAR</span>
            </div>
            <p className="font-terminal text-lg text-[#ff8ba7] max-w-xs mx-auto md:mx-0">
              The ultimate on-chain pixel battle arena. Compete, conquer, and earn on Base L2.
            </p>
          </div>

          {/* Links */}
          <div className="font-sans">
            <h4 className="font-retro text-lg mb-4 text-[#FFC6C7]">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link href="/play" className="hover:text-[#FFC6C7] transition-colors">Play Now</Link></li>
              <li><Link href="/tournament" className="hover:text-[#FFC6C7] transition-colors">Tournaments</Link></li>
              <li><Link href="/leaderboard" className="hover:text-[#FFC6C7] transition-colors">Leaderboard</Link></li>
            </ul>
          </div>

          {/* Socials */}
          <div>
            <h4 className="font-retro text-lg mb-4 text-[#FFC6C7]">Connect</h4>
            <div className="flex justify-center md:justify-start gap-4">
              <a href="#" className="bg-[#903749] p-2 rounded hover:bg-[#ff8ba7] transition-colors"><Twitter className="w-6 h-6" /></a>
              <a href="#" className="bg-[#903749] p-2 rounded hover:bg-[#ff8ba7] transition-colors"><Github className="w-6 h-6" /></a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#903749] text-center font-terminal text-[#ff8ba7]">
          <p>© {new Date().getFullYear()} Pixel War. All rights reserved.</p>
        </div>
      </ScrollReveal>
    </footer>
  );
}
