import React from 'react';

interface ChartTypeCardProps {
  icon: React.ReactNode;
  name: string;
  color: string;
  delay?: number;
}

const ChartTypeCard: React.FC<ChartTypeCardProps> = ({ icon, name, color, delay = 0 }) => {
  return (
    <div 
      className="transition-all duration-1000 transform hover:-translate-y-2"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 text-center">
        <div className={`w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
          <div className={color}>
            {icon}
          </div>
        </div>
        <h3 className="font-bold text-gray-800">{name}</h3>
      </div>
    </div>
  );
};

export default ChartTypeCard;
