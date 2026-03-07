interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Solid circular logo mark with "MP" monogram drawn as SVG paths for
 * consistent cross-browser rendering without relying on font metrics.
 */
const Logo = ({ className, size = 40 }: LogoProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    className={className}
    aria-label="Matthew Parisien"
  >
    <circle cx="20" cy="20" r="20" fill="#5266AB" />
    {/* M — left stem, right stem, and V-shaped centre diagonal */}
    <path
      d="M8 27V13h2l4 7 4-7h2v14h-2v-9.5l-3.2 5.6h-1.6L10 17.5V27H8z"
      fill="#ffffff"
    />
    {/* P — vertical stem and rounded top bowl */}
    <path
      d="M22 27V13h5c2.2 0 4 1.6 4 3.5S29.2 20 27 20h-3v7h-2zm2-9h3c1.1 0 2-.7 2-1.5S28.1 15 27 15h-3v3z"
      fill="#ffffff"
    />
  </svg>
);

export default Logo;
