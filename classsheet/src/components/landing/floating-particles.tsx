'use client';

import { motion } from 'framer-motion';

const PARTICLES = [
  { size: 6, x: '10%', y: '20%', delay: 0, duration: 6 },
  { size: 4, x: '25%', y: '60%', delay: 1.2, duration: 5 },
  { size: 8, x: '70%', y: '15%', delay: 0.5, duration: 7 },
  { size: 5, x: '85%', y: '45%', delay: 2, duration: 5.5 },
  { size: 3, x: '50%', y: '75%', delay: 0.8, duration: 6.5 },
  { size: 7, x: '15%', y: '80%', delay: 1.5, duration: 5.8 },
  { size: 4, x: '90%', y: '70%', delay: 0.3, duration: 6.2 },
  { size: 5, x: '40%', y: '30%', delay: 1.8, duration: 5.3 },
];

export function FloatingParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-rose-400/20"
          style={{ width: p.size, height: p.size, left: p.x, top: p.y }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
