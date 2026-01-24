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

//   .font-heading {
//     font-family: 'Press Start 2P', cursive;
//   }
  
//   .font-body {
//     font-family: 'VT323', monospace;
//   }

//   /* Pixel Button Styling */
//   .pixel-btn {
//     position: relative;
//     display: inline-block;
//     padding: 12px 24px;
//     font-family: 'Press Start 2P', cursive;
//     font-size: 12px;
//     line-height: 1;
//     text-transform: uppercase;
//     text-decoration: none;
//     border: none;
//     cursor: pointer;
//     background: transparent;
//     transition: transform 0.1s ease;
//     image-rendering: pixelated;
//     user-select: none;
//   }

//   .pixel-btn:active {
//     transform: translateY(2px);
//   }

//   /* Primary Button (Start Battle) */
//   .pixel-btn-primary {
//     color: white;
//     background-color: var(--pixel-primary-darker);
//     box-shadow: 
//       inset 2px 2px 0px 0px rgba(255,255,255,0.2),
//       inset -2px -2px 0px 0px rgba(0,0,0,0.2),
//       2px 2px 0px 0px #000000;
//   }

//   .pixel-btn-primary:hover {
//     background-color: var(--pixel-primary-dark);
//   }

//   /* Secondary Button (Join Tournament) */
//   .pixel-btn-secondary {
//     color: var(--pixel-primary-darker);
//     background-color: var(--pixel-primary-lighter);
//     box-shadow: 
//       inset 2px 2px 0px 0px rgba(255,255,255,0.5),
//       inset -2px -2px 0px 0px rgba(0,0,0,0.1),
//       2px 2px 0px 0px #000000;
//   }

//   .pixel-btn-secondary:hover {
//     background-color: #ffffff;
//   }

//   /* Navbar Connect Wallet Button */
//   .pixel-btn-connect {
//     font-family: 'VT323', monospace;
//     font-size: 20px;
//     font-weight: bold;
//     color: var(--pixel-primary-darker);
//     background-color: #fff;
//     padding: 8px 16px;
//     box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.2);
//     border: 2px solid var(--pixel-primary-darker);
//   }
  
//   .pixel-btn-connect:hover {
//     transform: translate(-1px, -1px);
//     box-shadow: 5px 5px 0px 0px rgba(0,0,0,0.2);
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
// `;

// // --- Interactive 3D Background Component ---
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

//     // Cubes
//     const cubes: { x: number; y: number; z: number; size: number; color: string; speed: number }[] = [];
//     const colors = [THEME.primaryLight, THEME.primaryLighter, THEME.primaryDark, '#ffffff'];

//     for (let i = 0; i < 50; i++) {
//       cubes.push({
//         x: Math.random() * width,
//         y: Math.random() * height,
//         z: Math.random() * 2 + 0.5, // Depth scale
//         size: Math.random() * 20 + 10,
//         color: colors[Math.floor(Math.random() * colors.length)],
//         speed: Math.random() * 0.5 + 0.2
//       });
//     }

//     let mouseX = width / 2;
//     let mouseY = height / 2;

//     const handleMouseMove = (e: MouseEvent) => {
//       mouseX = e.clientX;
//       mouseY = e.clientY;
//     };
//     window.addEventListener('mousemove', handleMouseMove);

//     const animate = () => {
//       ctx.fillStyle = THEME.bg;
//       ctx.fillRect(0, 0, width, height);

//       // Draw Grid Floor (Pseudo 3D)
//       ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
//       ctx.lineWidth = 1;
      
//       // Moving grid lines
//       const time = Date.now() * 0.0005;
//       const gridSize = 40;
//       const offsetY = (time * 20) % gridSize;

//       // Vertical lines
//       for (let x = 0; x < width; x += gridSize) {
//         ctx.beginPath();
//         ctx.moveTo(x, 0);
//         ctx.lineTo(x, height);
//         ctx.stroke();
//       }

//       // Horizontal lines (perspective illusion? just flat scrolling for pixel retro feel)
//       for (let y = -gridSize; y < height; y += gridSize) {
//         ctx.beginPath();
//         ctx.moveTo(0, y + offsetY);
//         ctx.lineTo(width, y + offsetY);
//         ctx.stroke();
//       }

//       // Draw Cubes
//       cubes.forEach((cube) => {
//         // Parallax effect based on mouse
//         const dx = (mouseX - width / 2) * 0.02 * cube.z;
//         const dy = (mouseY - height / 2) * 0.02 * cube.z;

//         cube.y -= cube.speed * cube.z;
        
//         // Reset if off screen
//         if (cube.y < -cube.size) {
//           cube.y = height + cube.size;
//           cube.x = Math.random() * width;
//         }

//         const renderX = cube.x + dx;
//         const renderY = cube.y + dy;

//         // Draw simple 3D block
//         ctx.fillStyle = cube.color;
//         // Front face
//         ctx.fillRect(renderX, renderY, cube.size, cube.size);
        
//         // Side face (darker)
//         ctx.fillStyle = 'rgba(0,0,0,0.2)';
//         ctx.fillRect(renderX + cube.size, renderY + 2, 4, cube.size - 2);
        
//         // Bottom face (shadow)
//         ctx.fillRect(renderX + 2, renderY + cube.size, cube.size - 2, 4);
//       });

//       requestAnimationFrame(animate);
//     };

//     const animId = requestAnimationFrame(animate);

//     const handleResize = () => {
//       width = window.innerWidth;
//       height = window.innerHeight;
//       canvas.width = width;
//       canvas.height = height;
//     };
//     window.addEventListener('resize', handleResize);

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
//       padding: '20px 40px',
//       maxWidth: '1200px',
//       margin: '0 auto',
//       width: '100%'
//     }}>
//       {/* Logo */}
//       <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
//         <div style={{ 
//           width: '32px', 
//           height: '32px', 
//           background: THEME.primaryDarker,
//           boxShadow: '4px 4px 0 rgba(0,0,0,0.2)',
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'center',
//           fontSize: '20px',
//           color: 'white',
//           fontFamily: "'Press Start 2P', cursive"
//         }}>P</div>
//         <span className="font-heading" style={{ fontSize: '18px', textShadow: '2px 2px 0 rgba(0,0,0,0.2)' }}>
//           PIXEL WAR
//         </span>
//       </div>

//       {/* Navigation Links */}
//       <div className="font-body" style={{ 
//         display: 'flex', 
//         gap: '40px', 
//         fontSize: '24px',
//         textTransform: 'uppercase',
//         letterSpacing: '1px'
//       }}>
//         <a href="#" style={{ color: 'white', textDecoration: 'none', borderBottom: '2px solid transparent' }}>Home</a>
//         <a href="#" style={{ color: 'white', textDecoration: 'none' }}>About</a>
//         <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Contact</a>
//       </div>

//       {/* Connect Wallet Button (was Contact) */}
//       <button className="pixel-btn-connect">
//         CONNECT WALLET
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
//       height: 'calc(100vh - 100px)',
//       textAlign: 'center',
//       padding: '0 20px',
//       maxWidth: '1000px',
//       margin: '0 auto'
//     }}>
//       {/* Eyebrow */}
//       <div className="font-heading" style={{ 
//         fontSize: '14px', 
//         color: THEME.primaryDarker, 
//         marginBottom: '20px',
//         background: THEME.primaryLight,
//         padding: '5px 10px',
//         boxShadow: '4px 4px 0 rgba(0,0,0,0.1)'
//       }}>
//         PIXEL WAR BETA
//       </div>

//       {/* Tagline */}
//       <h1 className="font-heading floating" style={{ 
//         fontSize: 'clamp(24px, 5vw, 48px)', 
//         lineHeight: '1.4', 
//         marginBottom: '40px',
//         textShadow: `4px 4px 0 ${THEME.primaryDarker}`,
//         maxWidth: '900px'
//       }}>
//         Real-Time PvP Battle Arena with Instant On-Chain Settlement on Base L2
//       </h1>

//       {/* CTA Buttons */}
//       <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
//         <button className="pixel-btn pixel-btn-primary" style={{ fontSize: '16px', padding: '20px 30px' }}>
//           START BATTLE
//         </button>
//         <button className="pixel-btn pixel-btn-secondary" style={{ fontSize: '16px', padding: '20px 30px' }}>
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
//       <div style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
//         <InteractiveBackground />
//         <Navbar />
//         <Hero />
//       </div>
//     </>
//   );
// };

// const root = createRoot(document.getElementById('root')!);
// root.render(<App />);
