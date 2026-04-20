'use client';

interface BaguaIconProps {
  size?: number;
  color?: string;
  className?: string;
  glow?: boolean;
}

export default function BaguaIcon({
  size = 120,
  color = 'var(--color-accent-gold)',
  className = '',
  glow = false,
}: BaguaIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={{
        filter: glow ? `drop-shadow(0 0 12px ${color})` : undefined,
      }}
    >
      {/* Outer circle */}
      <circle cx="60" cy="60" r="56" fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />

      {/* Tai Chi (Yin-Yang) */}
      <circle cx="60" cy="60" r="28" fill="none" stroke={color} strokeWidth="1.5" />

      {/* Yin-Yang S-curve */}
      <path
        d="M 60 32 A 14 14 0 0 1 60 60 A 14 14 0 0 0 60 88 A 28 28 0 0 1 60 32"
        fill={color}
        opacity="0.9"
      />

      {/* Yang dot */}
      <circle cx="60" cy="46" r="4" fill="var(--color-bg-primary)" />

      {/* Yin dot */}
      <circle cx="60" cy="74" r="4" fill={color} />

      {/* Bagua trigrams around the circle */}
      {/* Qian (Heaven) - top */}
      <g transform="translate(60, 8)">
        <line x1="-12" y1="0" x2="12" y2="0" stroke={color} strokeWidth="2.5" />
        <line x1="-12" y1="5" x2="12" y2="5" stroke={color} strokeWidth="2.5" />
        <line x1="-12" y1="10" x2="12" y2="10" stroke={color} strokeWidth="2.5" />
      </g>

      {/* Kun (Earth) - bottom */}
      <g transform="translate(60, 98)">
        <line x1="-12" y1="0" x2="-2" y2="0" stroke={color} strokeWidth="2.5" />
        <line x1="2" y1="0" x2="12" y2="0" stroke={color} strokeWidth="2.5" />
        <line x1="-12" y1="5" x2="-2" y2="5" stroke={color} strokeWidth="2.5" />
        <line x1="2" y1="5" x2="12" y2="5" stroke={color} strokeWidth="2.5" />
        <line x1="-12" y1="10" x2="-2" y2="10" stroke={color} strokeWidth="2.5" />
        <line x1="2" y1="10" x2="12" y2="10" stroke={color} strokeWidth="2.5" />
      </g>

      {/* Li (Fire) - left */}
      <g transform="translate(10, 54)">
        <line x1="0" y1="0" x2="14" y2="0" stroke={color} strokeWidth="2.5" />
        <line x1="0" y1="5" x2="5" y2="5" stroke={color} strokeWidth="2.5" />
        <line x1="9" y1="5" x2="14" y2="5" stroke={color} strokeWidth="2.5" />
        <line x1="0" y1="10" x2="14" y2="10" stroke={color} strokeWidth="2.5" />
      </g>

      {/* Kan (Water) - right */}
      <g transform="translate(96, 54)">
        <line x1="0" y1="0" x2="5" y2="0" stroke={color} strokeWidth="2.5" />
        <line x1="9" y1="0" x2="14" y2="0" stroke={color} strokeWidth="2.5" />
        <line x1="0" y1="5" x2="14" y2="5" stroke={color} strokeWidth="2.5" />
        <line x1="0" y1="10" x2="5" y2="10" stroke={color} strokeWidth="2.5" />
        <line x1="9" y1="10" x2="14" y2="10" stroke={color} strokeWidth="2.5" />
      </g>
    </svg>
  );
}
