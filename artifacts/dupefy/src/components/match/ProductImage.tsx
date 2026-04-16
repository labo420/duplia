import { useState } from "react";

const BEAUTY_FALLBACKS: Record<string, string> = {
  Skincare: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=600&fit=crop&q=80",
  Makeup: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=600&fit=crop&q=80",
  Profumi: "https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&h=600&fit=crop&q=80",
  Fragrance: "https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&h=600&fit=crop&q=80",
  Haircare: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&h=600&fit=crop&q=80",
  Bodycare: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&h=600&fit=crop&q=80",
  default: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=600&fit=crop&q=80",
};

interface ProductImageProps {
  src: string;
  alt: string;
  category?: string;
  className?: string;
}

export function ProductImage({ src, alt, category, className = "" }: ProductImageProps) {
  const fallback = BEAUTY_FALLBACKS[category ?? ""] ?? BEAUTY_FALLBACKS.default;
  const [imgSrc, setImgSrc] = useState(src || fallback);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={`w-full h-full object-cover ${className}`}
      onError={() => setImgSrc(fallback)}
      data-testid="product-image"
    />
  );
}
