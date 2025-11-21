import React from 'react';

/**
 * Modern T-Harbor Logo Component
 * A clean, professional logo with the letter "T" in a rounded container
 * Supports light and dark mode variants
 */
export default function Logo({ 
  size = 'default', 
  variant = 'light',
  className = '',
  showText = true 
}) {
  const sizeClasses = {
    small: 'h-8 w-8 text-sm',
    default: 'h-10 w-10 text-lg',
    large: 'h-12 w-12 text-xl',
    xl: 'h-16 w-16 text-2xl'
  };

  const logoSize = sizeClasses[size] || sizeClasses.default;
  const textSize = size === 'small' ? 'text-lg' : size === 'large' ? 'text-2xl' : size === 'xl' ? 'text-3xl' : 'text-xl';

  // Light mode: blue to teal gradient
  // Dark mode: lighter blue to cyan gradient
  const gradientClass = variant === 'dark' 
    ? 'from-blue-400 to-cyan-400' 
    : 'from-blue-600 to-teal-500';

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Logo Icon */}
      <div 
        className={`
          ${logoSize} 
          rounded-xl 
          bg-gradient-to-br 
          ${gradientClass}
          flex 
          items-center 
          justify-center 
          shadow-lg 
          shadow-blue-500/30 
          transition-all 
          duration-300 
          hover:scale-105 
          hover:shadow-xl 
          hover:shadow-blue-500/40
          backdrop-blur-sm
        `}
      >
        <span className="text-white font-bold tracking-tight">T</span>
      </div>
      
      {/* Logo Text */}
      {showText && (
        <span 
          className={`
            ${textSize} 
            font-bold 
            bg-gradient-to-r 
            ${gradientClass}
            bg-clip-text 
            text-transparent 
            tracking-tight
            font-sans
          `}
        >
          T-Harbor
        </span>
      )}
    </div>
  );
}

/**
 * Standalone Logo Icon (without text)
 */
export function LogoIcon({ size = 'default', variant = 'light', className = '' }) {
  return <Logo size={size} variant={variant} showText={false} className={className} />;
}

