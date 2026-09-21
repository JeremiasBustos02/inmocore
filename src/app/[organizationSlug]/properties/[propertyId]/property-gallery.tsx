"use client";

import { ChevronLeft, ChevronRight, House, X, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type PropertyGalleryImage = {
  id: string;
  url: string;
};

type PropertyGalleryProps = {
  images: PropertyGalleryImage[];
  propertyTitle: string;
  city: string;
};

export function PropertyGallery({ images, propertyTitle, city }: PropertyGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const activeImage = activeIndex === null ? null : images[activeIndex];

  useEffect(() => {
    if (activeIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveIndex(null);
      } else if (event.key === "ArrowLeft" && images.length > 1) {
        setActiveIndex((current) => (current === null ? null : (current - 1 + images.length) % images.length));
      } else if (event.key === "ArrowRight" && images.length > 1) {
        setActiveIndex((current) => (current === null ? null : (current + 1) % images.length));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, images.length]);

  function openImage(index: number) {
    setActiveIndex(index);
  }

  function moveImage(direction: -1 | 1) {
    setActiveIndex((current) =>
      current === null ? null : (current + direction + images.length) % images.length,
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] max-h-[620px] items-center justify-center rounded-lg bg-muted sm:aspect-[16/9]">
        <House aria-hidden="true" className="size-12 text-foreground/20" strokeWidth={1.3} />
      </div>
    );
  }

  const [mainImage, ...secondaryImages] = images;
  const imageAlt = `${propertyTitle} en ${city}`;

  return (
    <>
      <div className={secondaryImages.length > 0 ? "grid gap-2 lg:h-[520px] lg:grid-cols-[2fr_1fr]" : "relative aspect-[4/3] max-h-[680px] overflow-hidden rounded-lg bg-muted sm:aspect-[16/9]"}>
        <button
          aria-label={`Ampliar imagen 1 de ${images.length}`}
          className={secondaryImages.length > 0 ? "group relative aspect-[4/3] overflow-hidden rounded-lg bg-muted text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:aspect-auto" : "absolute inset-0 block size-full cursor-zoom-in text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring"}
          onClick={() => openImage(0)}
          type="button"
        >
          <Image alt={imageAlt} className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" fill preload sizes={secondaryImages.length > 0 ? "(max-width: 1023px) 100vw, 67vw" : "(max-width: 1320px) 100vw, 1240px"} src={mainImage.url} />
          <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-2 text-xs font-semibold text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <ZoomIn aria-hidden="true" className="size-4" />
            Ampliar
          </span>
        </button>

        {secondaryImages.length > 0 ? (
          <div className={secondaryImages.length === 1 ? "grid grid-cols-1 gap-2" : secondaryImages.length === 2 ? "grid grid-cols-2 gap-2 lg:grid-cols-1 lg:grid-rows-2" : "grid grid-cols-2 gap-2 lg:grid-rows-2"}>
            {secondaryImages.map((image, index) => (
              <button
                aria-label={`Ampliar imagen ${index + 2} de ${images.length}`}
                className={`group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-lg bg-muted text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:aspect-auto ${secondaryImages.length === 3 && index === 2 ? "col-span-2" : ""}`}
                key={image.id}
                onClick={() => openImage(index + 1)}
                type="button"
              >
                <Image alt={`${propertyTitle}, imagen ${index + 2}`} className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" fill sizes="(max-width: 1023px) 50vw, 17vw" src={image.url} />
                <span className="absolute inset-x-3 bottom-3 inline-flex justify-center rounded-full bg-background/90 px-2 py-1.5 text-xs font-semibold text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  Ampliar
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {activeImage ? (
        <div
          aria-label={`Galería de ${propertyTitle}`}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-8"
          onClick={(event) => {
            if (event.target === event.currentTarget) setActiveIndex(null);
          }}
          role="dialog"
        >
          <button
            aria-label="Cerrar galería"
            className="absolute right-4 top-4 z-10 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            onClick={() => setActiveIndex(null)}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>

          <div className="relative h-[min(78vh,720px)] w-full max-w-6xl">
            <Image alt={`${imageAlt}, imagen ${(activeIndex ?? 0) + 1}`} className="object-contain" fill priority sizes="(max-width: 768px) 100vw, 90vw" src={activeImage.url} />
          </div>

          {images.length > 1 ? (
            <>
              <button aria-label="Imagen anterior" className="absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-6" onClick={() => moveImage(-1)} type="button">
                <ChevronLeft aria-hidden="true" className="size-6" />
              </button>
              <button aria-label="Imagen siguiente" className="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6" onClick={() => moveImage(1)} type="button">
                <ChevronRight aria-hidden="true" className="size-6" />
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white" aria-live="polite">
                {(activeIndex ?? 0) + 1} / {images.length}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
