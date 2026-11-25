import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeSvgProps {
  value: string;
  size?: number;
  label?: string;
}

export function QrCodeSvg({ value, size = 112, label }: QrCodeSvgProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: '#1C1917', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] font-mono text-stone-500"
      >
        QR
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={label || `QR Code for ${value}`}
      width={size}
      height={size}
      className="border border-stone-200 bg-white p-1"
    />
  );
}
