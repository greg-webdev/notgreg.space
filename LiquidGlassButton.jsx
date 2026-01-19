// Liquid Glass Button Component
// A beautiful, modern button with glassmorphism effect and smooth animations

const LiquidGlassButton = ({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'md',
  className = ''
}) => {
  const baseStyles = `
    position: relative;
    font-weight: 600;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
    border: 1px solid rgba(255, 255, 255, 0.18);
  `;

  const variantStyles = {
    primary: `
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.12) 100%);
      color: white;
    `,
    secondary: `
      background: linear-gradient(135deg, rgba(100, 200, 255, 0.3) 0%, rgba(100, 150, 255, 0.15) 100%);
      color: #e0f7ff;
    `,
    accent: `
      background: linear-gradient(135deg, rgba(255, 100, 150, 0.3) 0%, rgba(255, 150, 180, 0.15) 100%);
      color: #fff5f7;
    `,
  };

  const sizeStyles = {
    sm: 'padding: 8px 16px; font-size: 12px;',
    md: 'padding: 12px 24px; font-size: 14px;',
    lg: 'padding: 16px 32px; font-size: 16px;',
  };

  const hoverStyles = `
    &:hover {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.22) 100%);
      box-shadow: 0 12px 48px 0 rgba(31, 38, 135, 0.5);
      transform: translateY(-2px);
    }

    &:active {
      transform: translateY(0);
      box-shadow: 0 4px 16px 0 rgba(31, 38, 135, 0.3);
    }
  `;

  const style = {
    padding: sizeStyles[size]?.split(';')[0].split(':')[1].trim(),
    fontSize: sizeStyles[size]?.split(';')[1].split(':')[1].trim(),
    background: variantStyles[variant]?.split(';')[0].split(':')[1].trim(),
    color: variantStyles[variant]?.split(';')[1].split(':')[1].trim(),
    position: 'relative',
    fontWeight: '600',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '12px',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  };

  return (
    <button
      onClick={onClick}
      className={`liquid-glass-button ${className}`}
      style={style}
      onMouseEnter={(e) => {
        e.target.style.background = variantStyles[variant].includes('rgba(255, 255, 255') 
          ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.22) 100%)'
          : variantStyles[variant].split(';')[0].replace('0.3', '0.4').replace('0.15', '0.25');
        e.target.style.boxShadow = '0 12px 48px 0 rgba(31, 38, 135, 0.5)';
        e.target.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.target.style.background = variantStyles[variant].split(';')[0].split(':')[1].trim();
        e.target.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)';
        e.target.style.transform = 'translateY(0)';
      }}
      onMouseDown={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = '0 4px 16px 0 rgba(31, 38, 135, 0.3)';
      }}
      onMouseUp={(e) => {
        e.target.style.transform = 'translateY(-2px)';
        e.target.style.boxShadow = '0 12px 48px 0 rgba(31, 38, 135, 0.5)';
      }}
    >
      {children}
    </button>
  );
};

// Export the component
export default LiquidGlassButton;
