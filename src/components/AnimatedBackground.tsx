import React, { useEffect, useState } from 'react';

const AnimatedBackground: React.FC = () => {
  const [orbs, setOrbs] = useState<Array<{ id: number; x: number; y: number; size: number; color: string }>>([]);

  useEffect(() => {
    const generateOrbs = () => {
      const newOrbs = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 400 + 200,
        color: i % 3 === 0 ? 'from-blue-400 to-blue-600' : i % 3 === 1 ? 'from-purple-400 to-purple-600' : 'from-pink-400 to-pink-600'
      }));
      setOrbs(newOrbs);
    };

    generateOrbs();
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
      {orbs.map((orb) => (
        <div
          key={orb.id}
          className={`absolute rounded-full bg-gradient-to-r ${orb.color} opacity-20 blur-3xl animate-pulse animate-float`}
          style={{
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            animationDelay: `${orb.id * 0.5}s`
          }}
        ></div>
      ))}
    </div>
  );
};

export default AnimatedBackground;
