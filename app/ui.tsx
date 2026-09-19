"use client";
import { useEffect, useRef } from "react";
import { PawPrint, X } from "lucide-react";
import { type Product } from "../lib/catalog";
export function ProductArt({ product }: { product: Product }) {
  const image = product.image || product.images?.[0];
  return image ? (
    <img
      className="product-photo"
      src={image}
      alt={product.name}
      loading="lazy"
    />
  ) : (
    <div
      role="img"
      aria-label={product.name}
      className={`product-art art-${product.art}`}
      style={{ backgroundImage: "url(/images/products.webp)" }}
    />
  );
}
export function Brand() {
  return (
    <a className="brand" href="/" aria-label="PAWPAL หน้าแรก">
      <span className="brand-mark">
        <PawPrint fill="currentColor" size={24} />
      </span>
      pawpal<span className="brand-dot">®</span>
    </a>
  );
}
export function Modal({
  title,
  close,
  children,
  wide = false,
  className = "",
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null),
    callback = useRef(close);
  callback.current = close;
  useEffect(() => {
    const old = document.activeElement as HTMLElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") callback.current();
      if (e.key === "Tab") {
        const els = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input:not(:disabled),select,textarea,[tabindex="0"]',
          ) || [],
        );
        const first = els[0],
          last = els.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      old?.focus();
    };
  }, []);
  return (
    <div className="modal-shade" onClick={close}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" onClick={close} aria-label="ปิด">
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
