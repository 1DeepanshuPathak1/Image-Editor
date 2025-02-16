import React from 'react';
import { Star } from 'lucide-react';

const SongScoreDisplay = ({ score }) => {
  const normalizedScore = Math.max(0, Math.min(100, Number(score)));

  const filledStars = (normalizedScore / 100) * 5;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-row items-center gap-1">
        {[...Array(5)].map((_, index) => {
          return (
            <Star
              key={index}
              size={20}
              fill={index < filledStars ? "currentColor" : "none"}
              className={index < filledStars ? "text-yellow-400" : "text-gray-300"}
            />
          );
        })}
      </div>
      <span className="text-sm text-gray-600">
        {Math.round(normalizedScore)}% match
      </span>
    </div>
  );
};

export default SongScoreDisplay;