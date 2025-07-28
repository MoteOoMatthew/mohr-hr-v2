import React from 'react';

const RadishIcon = ({ size = 24, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Radish body - vibrant red with highlights */}
      <circle cx="12" cy="14" r="6" fill="#dc2626"/>
      <circle cx="10.5" cy="12" r="2.5" fill="#ef4444" opacity="0.6"/>
      
      {/* Root - light beige/off-white with jagged edge */}
      <path d="M9 20 L15 20 L13.5 24 L10.5 24 Z" fill="#f5f5dc"/>
      <path d="M9.75 20 L14.25 20 L13 22.5 L11 22.5 Z" fill="#fafafa"/>
      
      {/* Green leaves fanning out from top-right */}
      <path d="M15 7.5 Q16.5 6 18 7.5 Q16.5 9 15 7.5" fill="#16a34a"/>
      <path d="M13.5 7.5 Q15 6 16.5 7.5 Q15 9 13.5 7.5" fill="#22c55e"/>
      <path d="M12 7.5 Q13.5 6 15 7.5 Q13.5 9 12 7.5" fill="#15803d"/>
      
      {/* Leaf details */}
      <path d="M15 7.5 Q15.75 6.75 16.5 7.5" stroke="#15803d" strokeWidth="0.5" fill="none"/>
      <path d="M13.5 7.5 Q14.25 6.75 15 7.5" stroke="#15803d" strokeWidth="0.5" fill="none"/>
      <path d="M12 7.5 Q12.75 6.75 13.5 7.5" stroke="#15803d" strokeWidth="0.5" fill="none"/>
    </svg>
  );
};

export default RadishIcon; 