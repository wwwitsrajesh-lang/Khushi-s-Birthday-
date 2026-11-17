interface BalloonConfig {
  id: string;
  left: string;
  size: number;
  color: string;
  highlight: string;
  duration: string;
  delay: string;
  swayClass: string;
}

interface SparkleConfig {
  id: string;
  top: string;
  left: string;
  size: number;
  color: string;
  duration: string;
  delay: string;
}

const FLOATING_BALLOONS: BalloonConfig[] = [
  { id: 'b1', left: '3%', size: 46, color: '#FF4FA6', highlight: '#FFB8DC', duration: '24s', delay: '-4s', swayClass: 'balloon-sway-a' },
  { id: 'b2', left: '9%', size: 38, color: '#5BE3F5', highlight: '#C7F7FF', duration: '28s', delay: '-15s', swayClass: 'balloon-sway-b' },
  { id: 'b3', left: '16%', size: 42, color: '#C78BFF', highlight: '#EBD4FF', duration: '31s', delay: '-9s', swayClass: 'balloon-sway-a' },
  { id: 'b4', left: '25%', size: 34, color: '#FFD84D', highlight: '#FFF3B0', duration: '26s', delay: '-21s', swayClass: 'balloon-sway-b' },
  { id: 'b5', left: '72%', size: 36, color: '#FF85C2', highlight: '#FFD6EB', duration: '29s', delay: '-7s', swayClass: 'balloon-sway-a' },
  { id: 'b6', left: '81%', size: 44, color: '#69E2F5', highlight: '#D2F9FF', duration: '25s', delay: '-18s', swayClass: 'balloon-sway-b' },
  { id: 'b7', left: '88%', size: 40, color: '#D49EFF', highlight: '#F0DEFF', duration: '27s', delay: '-2s', swayClass: 'balloon-sway-a' },
  { id: 'b8', left: '94%', size: 46, color: '#FF3D9A', highlight: '#FFB0D8', duration: '23s', delay: '-12s', swayClass: 'balloon-sway-b' },
];

const FLOATING_SPARKLES: SparkleConfig[] = [
  { id: 's1', top: '12%', left: '6%', size: 18, color: '#F5C542', duration: '3.2s', delay: '0s' },
  { id: 's2', top: '18%', left: '92%', size: 22, color: '#FF4FA6', duration: '2.8s', delay: '0.6s' },
  { id: 's3', top: '26%', left: '14%', size: 14, color: '#5BE3F5', duration: '3.6s', delay: '1.1s' },
  { id: 's4', top: '31%', left: '85%', size: 16, color: '#C78BFF', duration: '3.1s', delay: '0.3s' },
  { id: 's5', top: '40%', left: '4%', size: 20, color: '#FF6BB5', duration: '2.9s', delay: '1.5s' },
  { id: 's6', top: '44%', left: '95%', size: 18, color: '#F5C542', duration: '3.4s', delay: '0.8s' },
  { id: 's7', top: '53%', left: '11%', size: 16, color: '#FFD84D', duration: '3.0s', delay: '1.9s' },
  { id: 's8', top: '58%', left: '89%', size: 20, color: '#5BE3F5', duration: '2.7s', delay: '0.4s' },
  { id: 's9', top: '66%', left: '6%', size: 22, color: '#C78BFF', duration: '3.5s', delay: '1.2s' },
  { id: 's10', top: '71%', left: '93%', size: 16, color: '#FF4FA6', duration: '2.9s', delay: '2.1s' },
  { id: 's11', top: '79%', left: '15%', size: 18, color: '#FF6BB5', duration: '3.3s', delay: '0.5s' },
  { id: 's12', top: '83%', left: '84%', size: 22, color: '#F5C542', duration: '3.1s', delay: '1.4s' },
  { id: 's13', top: '90%', left: '8%', size: 15, color: '#5BE3F5', duration: '2.8s', delay: '0.9s' },
  { id: 's14', top: '92%', left: '91%', size: 19, color: '#C78BFF', duration: '3.4s', delay: '1.7s' },
  { id: 's15', top: '22%', left: '48%', size: 14, color: '#FFD84D', duration: '3.6s', delay: '0.7s' },
  { id: 's16', top: '49%', left: '52%', size: 14, color: '#FF85C2', duration: '3.2s', delay: '1.8s' },
  { id: 's17', top: '74%', left: '47%', size: 15, color: '#5BE3F5', duration: '3.0s', delay: '0.2s' },
];

export function FloatingPartyBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-20 select-none"
    >
      {/* Floating colourful birthday balloons */}
      {FLOATING_BALLOONS.map((balloon) => (
        <div
          key={balloon.id}
          className={`floating-balloon ${balloon.swayClass}`}
          style={{
            left: balloon.left,
            width: `${balloon.size}px`,
            animationDuration: balloon.duration,
            animationDelay: balloon.delay,
          }}
        >
          <svg
            viewBox="0 0 64 118"
            className="w-full h-auto drop-shadow-[0_6px_10px_rgba(194,89,117,0.18)]"
          >
            {/* Curly ribbon string */}
            <path
              d="M32 68 Q26 82 34 94 T30 116"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Balloon knot */}
            <polygon points="28,66 36,66 32,60" fill={balloon.color} />
            {/* Main balloon body */}
            <ellipse cx="32" cy="34" rx="24" ry="29" fill={balloon.color} />
            {/* Glossy highlight */}
            <ellipse
              cx="23"
              cy="22"
              rx="6.5"
              ry="11"
              transform="rotate(-22 23 22)"
              fill={balloon.highlight}
              opacity="0.72"
            />
          </svg>
        </div>
      ))}

      {/* Twinkling 4-point birthday sparkles across the page */}
      {FLOATING_SPARKLES.map((sparkle) => (
        <svg
          key={sparkle.id}
          viewBox="0 0 24 24"
          className="floating-sparkle"
          style={{
            top: sparkle.top,
            left: sparkle.left,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            animationDuration: sparkle.duration,
            animationDelay: sparkle.delay,
          }}
        >
          <path
            d="M12 1 L14.6 9.4 L23 12 L14.6 14.6 L12 23 L9.4 14.6 L1 12 L9.4 9.4 Z"
            fill={sparkle.color}
          />
        </svg>
      ))}
    </div>
  );
}
