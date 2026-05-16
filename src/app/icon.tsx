import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/**
 * Dynamic favicon using the CapNomade emblem (simplified for 32x32).
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0e2236',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#4eb893',
          fontFamily: 'serif',
          fontWeight: 700,
          fontSize: 22,
        }}
      >
        <span>
          <span style={{ color: '#dbecf3' }}>C</span>
          <span style={{ color: '#4eb893' }}>N</span>
        </span>
      </div>
    ),
    { ...size },
  );
}
