/**
 * MerchFlow logo, inline so it follows the theme: the "M" and "Merch" take
 * currentColor, the connector, dot and "Flow" stay brand red.
 * Geometry matches merchflow-brand/out/wordmark.svg and mark-on-light.svg.
 */

const RED = '#E8003D';

function MarkPaths() {
  return (
    <>
      <path d="M10 44 L10 12 L28 32 L46 12 L46 44" stroke="currentColor" />
      <path d="M46 44 L50 44 Q54 44 54 40 L54 32" stroke={RED} />
      <circle cx="54" cy="28" r="4" fill={RED} stroke="none" />
    </>
  );
}

export function MerchFlowMark({ className, title = 'MerchFlow' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <g
        transform="translate(-2.637 2.611) scale(1.0496)"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <MarkPaths />
      </g>
    </svg>
  );
}

export function MerchFlowWordmark({
  className,
  endorsement = true,
}: {
  className?: string;
  /** Show "by Global Merchandising Services" under the name. */
  endorsement?: boolean;
}) {
  return (
    <svg
      viewBox={endorsement ? '0 0 300 64' : '0 0 210 64'}
      className={className}
      role="img"
      aria-label="MerchFlow by Global Merchandising Services"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        transform="translate(-1 4)"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <MarkPaths />
      </g>
      <text
        x="66"
        y="36"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="30"
        fontWeight="800"
        letterSpacing="-0.6"
        fill="currentColor"
      >
        Merch<tspan fill={RED}>Flow</tspan>
      </text>
      {endorsement && (
        <text
          x="67"
          y="53"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="10.5"
          fontWeight="500"
          fill="currentColor"
          fillOpacity="0.65"
        >
          by Global Merchandising Services
        </text>
      )}
    </svg>
  );
}
