import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import './GalaxyButton.css';

interface GalaxyButtonProps {
  to?: string;
  onClick?: (e: React.MouseEvent) => void;
  text?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const STATIC_STARS = [
  { duration: 12, delay: 2, size: 3, alpha: 0.8 },
  { duration: 8, delay: 5, size: 2, alpha: 0.7 },
  { duration: 15, delay: 1, size: 4, alpha: 0.9 },
  { duration: 10, delay: 7, size: 3, alpha: 0.75 },
];

export const GalaxyButton: React.FC<GalaxyButtonProps> = ({
  to,
  onClick,
  text = 'Explore',
  icon,
  className = '',
  disabled = false,
  type = 'button',
}) => {
  const orbitStars = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      angle: (i * 18 + ((i * 7) % 13)) % 360,
      duration: 7 + (i % 6) * 2,
      delay: (i * 0.6) % 6,
      alpha: 0.45 + ((i % 5) * 0.1),
      size: 2 + (i % 3),
      distance: 35 + (i * 6),
    }));
  }, []);

  const content = (
    <>
      <span className="spark" />
      <span className="backdrop" />
      <span className="galaxy__container">
        {STATIC_STARS.map((s, i) => (
          <span
            key={`static-${i}`}
            className="galaxy-star star--static"
            style={
              {
                '--duration': s.duration,
                '--delay': s.delay,
                '--size': s.size,
                '--alpha': s.alpha,
              } as React.CSSProperties
            }
          />
        ))}
      </span>
      <span className="galaxy">
        <span className="galaxy__ring">
          {orbitStars.map((s, i) => (
            <span
              key={`orbit-${i}`}
              className="galaxy-star"
              style={
                {
                  '--angle': `${s.angle}deg`,
                  '--duration': s.duration,
                  '--delay': s.delay,
                  '--size': s.size,
                  '--alpha': s.alpha,
                  '--distance': s.distance,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
      </span>
      <span className="galaxy-text">
        <span>{text}</span>
        {icon}
      </span>
    </>
  );

  return (
    <div className={`galaxy-button galaxy-btn-wrapper ${className}`}>
      {to && !disabled ? (
        <Link to={to} className="galaxy-btn">
          {content}
        </Link>
      ) : (
        <button
          type={type}
          onClick={onClick}
          disabled={disabled}
          className={`galaxy-btn ${disabled ? 'disabled' : ''}`}
        >
          {content}
        </button>
      )}
    </div>
  );
};

export default GalaxyButton;
