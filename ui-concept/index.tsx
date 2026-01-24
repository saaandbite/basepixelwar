// import React, { useEffect, useRef, useState } from 'react';
// import { createRoot } from 'react-dom/client';

// // --- Colors & Theme ---
// const THEME = {
//   primary: '#ff8ba7',
//   primaryLight: '#ffc6c7',
//   primaryLighter: '#ffe4e6',
//   primaryDark: '#c44569',
//   primaryDarker: '#903749',
//   bg: '#ff8ba7',
//   fg: '#FFFFFF',
// };

// // --- CSS Styles ---
// const styles = `
//   :root {
//     --pixel-primary: ${THEME.primary};
//     --pixel-primary-light: ${THEME.primaryLight};
//     --pixel-primary-lighter: ${THEME.primaryLighter};
//     --pixel-primary-dark: ${THEME.primaryDark};
//     --pixel-primary-darker: ${THEME.primaryDarker};
//     --pixel-fg: ${THEME.fg};
//   }

//   .font-pixel {
//     font-family: 'Press Start 2P', cursive;
//   }
  
//   .font-modern {
//     font-family: 'Inter', sans-serif;
//   }

//   /* Modern Rounded Button Styling */
//   .btn-rounded {
//     position: relative;
//     display: inline-flex;
//     align-items: center;
//     justify-content: center;
//     padding: 16px 32px;
//     font-family: 'Inter', sans-serif;
//     font-weight: 700;
//     font-size: 16px;
//     line-height: 1;
//     text-decoration: none;
//     border: none;
//     cursor: pointer;
//     border-radius: 50px; /* Full pill shape */
//     transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
//     box-shadow: 0 4px 6px rgba(0,0,0,0.1);
//     letter-spacing: 0.5px;
//     z-index: 20;
//   }

//   .btn-rounded:active {
//     transform: scale(0.98);
//   }

//   /* Primary Button (Start Battle) */
//   .btn-primary {
//     color: white;
//     background: var(--pixel-primary-darker);
//     box-shadow: 0 10px 20px rgba(144, 55, 73, 0.3);
//   }

//   .btn-primary:hover {
//     background: var(--pixel-primary-dark);
//     transform: translateY(-2px);
//     box-shadow: 0 14px 24px rgba(144, 55, 73, 0.4);
//   }

//   /* Secondary Button (Join Tournament) */
//   .btn-secondary {
//     color: white;
//     background: rgba(255, 255, 255, 0.15);
//     backdrop-filter: blur(4px);
//     border: 2px solid rgba(255, 255, 255, 0.5);
//   }

//   .btn-secondary:hover {
//     background: rgba(255, 255, 255, 0.25);
//     border-color: white;
//     transform: translateY(-2px);
//   }

//   /* Navbar Connect Wallet Button */
//   .btn-connect {
//     font-family: 'Inter', sans-serif;
//     font-size: 14px;
//     font-weight: 700;
//     color: var(--pixel-primary-darker);
//     background-color: #fff;
//     padding: 10px 24px;
//     border-radius: 50px;
//     border: none;
//     box-shadow: 0 4px 12px rgba(0,0,0,0.1);
//     transition: all 0.2s ease;
//   }
  
//   .btn-connect:hover {
//     transform: translateY(-1px);
//     box-shadow: 0 6px 16px rgba(0,0,0,0.15);
//   }

//   /* Navbar Link Styles */
//   .nav-link {
//     color: white;
//     text-decoration: none;
//     font-weight: 600;
//     font-size: 15px;
//     opacity: 0.9;
//     transition: opacity 0.2s;
//   }
  
//   .nav-link:hover {
//     opacity: 1;
//     text-shadow: 0 0 10px rgba(255,255,255,0.5);
//   }

//   /* Animations */
//   @keyframes float {
//     0% { transform: translateY(0px); }
//     50% { transform: translateY(-10px); }
//     100% { transform: translateY(0px); }
//   }

//   .floating {
//     animation: float 4s ease-in-out infinite;
//   }
  
//   /* Glitch Effect for Main Title */
//   .glitch-text {
//     position: relative;
//   }
  
//   .glitch-text::before,
//   .glitch-text::after {
//     content: attr(data-text);
//     position: absolute;
//     top: 0;
//     left: 0;
//     width: 100%;
//     height: 100%;
//     opacity: 0.8;
//   }
  
//   .glitch-text::before {
//     color: #0ff;
//     z-index: -1;
//     animation: glitch-anim-1 2s infinite linear alternate-reverse;
//   }
  
//   .glitch-text::after {
//     color: #f0f;
//     z-index: -2;
//     animation: glitch-anim-2 2s infinite linear alternate-reverse;
//   }
  
//   @keyframes glitch-anim-1 {
//     0% { clip-path: inset(20% 0 80% 0); transform: translate(-2px, 0); }
//     20% { clip-path: inset(60% 0 10% 0); transform: translate(2px, 0); }
//     40% { clip-path: inset(40% 0 50% 0); transform: translate(-2px, 0); }
//     60% { clip-path: inset(80% 0 5% 0); transform: translate(2px, 0); }
//     80% { clip-path: inset(10% 0 70% 0); transform: translate(-2px, 0); }
//     100% { clip-path: inset(30% 0 20% 0); transform: translate(2px, 0); }
//   }

//   @keyframes glitch-anim-2 {
//     0% { clip-path: inset(10% 0 60% 0); transform: translate(2px, 0); }
//     20% { clip-path: inset(80% 0 5% 0); transform: translate(-2px, 0); }
//     40% { clip-path: inset(30% 0 20% 0); transform: translate(2px, 0); }
//     60% { clip-path: inset(15% 0 80% 0); transform: translate(-2px, 0); }
//     80% { clip-path: inset(55% 0 10% 0); transform: translate(2px, 0); }
//     100% { clip-path: inset(40% 0 30% 0); transform: translate(-2px, 0); }
//   }

//   /* Disable glitch reduced motion preference */
//   @media (prefers-reduced-motion: reduce) {
//     .glitch-text::before,
//     .glitch-text::after {
//       animation: none;
//       display: none;
//     }
//   }
// `;

// // --- Interactive 3D Background Component (Territory War Grid) ---
// const InteractiveBackground = () => {
//   const canvasRef = useRef<HTMLCanvasElement>(null);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext('2d');
//     if (!ctx) return;

//     let width = window.innerWidth;
//     let height = window.innerHeight;
//     canvas.width = width;
//     canvas.height = height;

//     // Grid Settings
//     const tileWidth = 60;
//     const tileHeight = 30; // Isometric 2:1 ratio
    
//     // Calculate Rows/Cols to cover screen + buffer
//     const cols = Math.ceil(width / tileWidth) * 2 + 10;
//     const rows = Math.ceil(height / tileHeight) * 2 + 10;

//     // Grid State: 0 = Neutral, 1 = Faction A (Dark), 2 = Faction B (Light)
//     // Initial random distribution centered
//     const grid = new Array(rows).fill(0).map(() => new Array(cols).fill(0).map(() => {
//       const rand = Math.random();
//       if (rand > 0.9) return 1; // Sparse Faction A
//       if (rand > 0.8) return 2; // Sparse Faction B
//       return 0; // Mostly Neutral
//     }));

//     let tick = 0;
//     let mouseX = width / 2;
//     let mouseY = height / 2;

//     const handleMouseMove = (e: MouseEvent) => {
//       mouseX = e.clientX;
//       mouseY = e.clientY;
//     };
//     window.addEventListener('mousemove', handleMouseMove);

//     const handleResize = () => {
//       width = window.innerWidth;
//       height = window.innerHeight;
//       canvas.width = width;
//       canvas.height = height;
//     };
//     window.addEventListener('resize', handleResize);

//     const drawBlock = (x: number, y: number, type: number, zOffset: number) => {
//       // Define colors based on Type (Faction)
//       let top, right, left;

//       if (type === 1) { // Faction A (Dark/Red - The Aggressor)
//         top = THEME.primaryDarker;
//         right = '#5c1a26'; 
//         left = THEME.primaryDark;
//       } else if (type === 2) { // Faction B (Light/White - The Defender)
//         top = '#ffffff';
//         right = THEME.primaryLight; 
//         left = '#ffe4e6';
//       } else { // Neutral (Base Terrain)
//         top = THEME.primary;
//         right = THEME.primaryDark;
//         left = THEME.primaryDark; // Slightly darker for depth
//       }

//       // Height of the block extrusion
//       const blockHeight = 12;

//       ctx.lineWidth = 1;
//       ctx.lineJoin = 'round';
      
//       // Calculate Vertices
//       const topY = y - zOffset;
      
//       // Top Face (Diamond)
//       ctx.beginPath();
//       ctx.moveTo(x, topY);
//       ctx.lineTo(x + tileWidth / 2, topY + tileHeight / 2);
//       ctx.lineTo(x, topY + tileHeight);
//       ctx.lineTo(x - tileWidth / 2, topY + tileHeight / 2);
//       ctx.closePath();
//       ctx.fillStyle = top;
//       ctx.fill();
      
//       // Subtle border for grid definition
//       ctx.strokeStyle = 'rgba(255,255,255,0.15)';
//       ctx.stroke();

//       // Right Face
//       ctx.beginPath();
//       ctx.moveTo(x + tileWidth / 2, topY + tileHeight / 2);
//       ctx.lineTo(x, topY + tileHeight);
//       ctx.lineTo(x, topY + tileHeight + blockHeight);
//       ctx.lineTo(x + tileWidth / 2, topY + tileHeight / 2 + blockHeight);
//       ctx.closePath();
//       ctx.fillStyle = right;
//       ctx.fill();

//       // Left Face
//       ctx.beginPath();
//       ctx.moveTo(x - tileWidth / 2, topY + tileHeight / 2);
//       ctx.lineTo(x, topY + tileHeight);
//       ctx.lineTo(x, topY + tileHeight + blockHeight);
//       ctx.lineTo(x - tileWidth / 2, topY + tileHeight / 2 + blockHeight);
//       ctx.closePath();
//       ctx.fillStyle = left;
//       ctx.fill();
//     };

//     const animate = () => {
//       // Background clear
//       ctx.fillStyle = THEME.bg;
//       ctx.fillRect(0, 0, width, height);
      
//       tick++;

//       // Isometric Transformation Center
//       const startX = width / 2;
//       const startY = -height / 2; // Start high to fill down

//       for (let r = 0; r < rows; r++) {
//         for (let c = 0; c < cols; c++) {
//           // Convert Grid(r,c) to Screen(x,y)
//           const cx = (c - r) * tileWidth / 2 + startX;
//           const cy = (c + r) * tileHeight / 2 + startY;

//           // Optimization: Check bounds
//           if (cx < -tileWidth || cx > width + tileWidth || cy < -tileHeight || cy > height + tileHeight) {
//             continue;
//           }

//           // Dynamic Logic: "Conquer" neighbors randomly
//           if (tick % 10 === 0 && Math.random() > 0.999) {
//              const type = grid[r][c];
//              if (type !== 0) {
//                 // Try to spread to a random neighbor
//                 const dr = Math.floor(Math.random() * 3) - 1;
//                 const dc = Math.floor(Math.random() * 3) - 1;
//                 const nr = r + dr;
//                 const nc = c + dc;
//                 if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
//                     grid[nr][nc] = type;
//                 }
//              }
//           }

//           // Animation: Wave height
//           // Dist from center for wave
//           const dist = Math.sqrt((r - rows/2)**2 + (c - cols/2)**2);
//           let z = Math.sin(dist * 0.2 - tick * 0.05) * 8; // Gentle breathing wave
          
//           // Mouse Interaction: Lift tiles near cursor
//           // Approx screen pos check
//           const dx = cx - mouseX;
//           const dy = (cy + tileHeight/2) - mouseY;
//           const mouseDist = Math.sqrt(dx*dx + dy*dy);
          
//           if (mouseDist < 120) {
//              z += (120 - mouseDist) * 0.3; // Lift up
//              // Highlight effect
//              if (grid[r][c] === 0) {
//                 // Temporary highlight for neutral tiles near mouse
//                 // We handle this by just modifying the draw call color logic implicitly or override here, 
//                 // but for simplicity we keep state logic separate.
//              }
//           }

//           drawBlock(cx, cy, grid[r][c], z);
//         }
//       }

//       requestAnimationFrame(animate);
//     };

//     const animId = requestAnimationFrame(animate);

//     return () => {
//       window.removeEventListener('mousemove', handleMouseMove);
//       window.removeEventListener('resize', handleResize);
//       cancelAnimationFrame(animId);
//     };
//   }, []);

//   return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }} />;
// };

// // --- Navbar Component ---
// const Navbar = () => {
//   return (
//     <nav style={{
//       position: 'relative',
//       zIndex: 10,
//       display: 'flex',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       padding: '24px 48px',
//       maxWidth: '1400px',
//       margin: '0 auto',
//       width: '100%'
//     }}>
//       {/* Logo - Keeps Pixel Font for Brand Identity */}
//       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//         <div style={{ 
//           width: '36px', 
//           height: '36px', 
//           background: THEME.primaryDarker,
//           borderRadius: '8px', // Slightly rounded logo container
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'center',
//           fontSize: '20px',
//           color: 'white',
//           fontFamily: "'Press Start 2P', cursive",
//           boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
//         }}>P</div>
//         <span className="font-pixel" style={{ fontSize: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
//           PIXEL WAR
//         </span>
//       </div>

//       {/* Navigation Links - Switched to Modern Font */}
//       <div className="font-modern" style={{ 
//         display: 'flex', 
//         gap: '40px', 
//       }}>
//         <a href="#" className="nav-link">Home</a>
//         <a href="#" className="nav-link">About</a>
//         <a href="#" className="nav-link">Community</a>
//         <a href="#" className="nav-link">Contact</a>
//       </div>

//       {/* Connect Wallet Button - Clear Rounded */}
//       <button className="btn-connect">
//         Connect Wallet
//       </button>
//     </nav>
//   );
// };

// // --- Hero Section Component ---
// const Hero = () => {
//   return (
//     <div style={{
//       position: 'relative',
//       zIndex: 10,
//       display: 'flex',
//       flexDirection: 'column',
//       justifyContent: 'center',
//       alignItems: 'center',
//       minHeight: 'calc(100vh - 100px)', // Adjust for navbar
//       textAlign: 'center',
//       padding: '0 20px',
//       maxWidth: '1200px',
//       margin: '0 auto',
//       marginTop: '-40px' // Visual centering
//     }}>
      
//       {/* Product Name - Now BIG and Pixel Art Style */}
//       <h1 className="font-pixel floating" data-text="PIXEL WAR" style={{ 
//         fontSize: 'clamp(48px, 8vw, 96px)', 
//         lineHeight: '1.1', 
//         marginBottom: '16px',
//         color: 'white',
//         textShadow: `4px 4px 0px ${THEME.primaryDarker}, 8px 8px 0px rgba(0,0,0,0.1)`
//       }}>
//         PIXEL WAR
//       </h1>

//       {/* Beta Tag - Small capsule */}
//       <div className="font-modern" style={{
//         background: THEME.primaryDarker,
//         color: 'white',
//         padding: '4px 12px',
//         borderRadius: '20px',
//         fontSize: '12px',
//         fontWeight: 'bold',
//         marginBottom: '24px',
//         letterSpacing: '1px',
//         boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
//       }}>
//         BETA RELEASE V.0.1
//       </div>

//       {/* Tagline - Now Smaller and Modern Font */}
//       <p className="font-modern" style={{ 
//         fontSize: 'clamp(16px, 2vw, 20px)', 
//         lineHeight: '1.6', 
//         marginBottom: '48px',
//         maxWidth: '600px',
//         fontWeight: '400',
//         color: '#fff',
//         opacity: 0.95,
//         textShadow: '0 2px 4px rgba(0,0,0,0.1)' // Added shadow for readability over busy bg
//       }}>
//         Experience the first real-time PvP battle arena with instant on-chain settlement on Base L2. 
//         Fight for glory, earn rewards, and dominate the leaderboard.
//       </p>

//       {/* CTA Buttons - Clear Rounded Style */}
//       <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
//         <button className="btn-rounded btn-primary">
//           START BATTLE
//         </button>
//         <button className="btn-rounded btn-secondary">
//           JOIN TOURNAMENT
//         </button>
//       </div>

//     </div>
//   );
// };

// // --- Main App Component ---
// const App = () => {
//   return (
//     <>
//       <style>{styles}</style>
//       <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
//         <InteractiveBackground />
//         {/* Vignette Overlay to ensure text readability */}
//         <div style={{
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             background: 'radial-gradient(circle at center, transparent 0%, rgba(144, 55, 73, 0.2) 100%)',
//             pointerEvents: 'none',
//             zIndex: 1
//         }} />
//         <Navbar />
//         <Hero />
//       </div>
//     </>
//   );
// };

// const root = createRoot(document.getElementById('root')!);
// root.render(<App />);
