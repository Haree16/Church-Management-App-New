import React from 'react';

interface ChurchCrossIconProps {
  className?: string;
}

export const ChurchCrossIcon: React.FC<ChurchCrossIconProps> = ({ className = 'w-4 h-4' }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M10.5 2H13.5V8.5H19.5V11.5H13.5V22H10.5V11.5H4.5V8.5H10.5V2Z" />
    </svg>
  );
};
