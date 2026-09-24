"use client";

import { ChevronLeft, ChevronRight, House, X, ZoomIn } from "lucide-react";
import Image, { getImageProps } from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [entryOffset, setEntryOffset] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const pointerStartRef = useRef<{ id: number; x: number; y: number; horizontal: boolean | null } | null>(null);
  const suppressClickUntilRef = useRef(0);
  const dragOccurredRef = useRef(false);
  const dragOffsetRef = useRef(0);
  const preloadedImagesRef = useRef(new Set<string>());
  const activeImage = activeIndex === null ? null : images[activeIndex];

  const navigate = useCallback((direction: -1 | 1) => {
    if (images.length < 2) return;
    setActiveIndex((current) => current === null ? null : (current + direction + images.length) % images.length);
    setDragOffset(0);
    dragOffsetRef.current = 0;
    setEntryOffset(direction * 28);
    requestAnimationFrame(() => setEntryOffset(0));
  }, [images.length]);

  useEffect(() => {
    if (activeIndex === null || images.length < 2) return;
    const previous = images[(activeIndex - 1 + images.length) % images.length];
    const next = images[(activeIndex + 1) % images.length];
    for (const image of [previous, next]) {
      if (preloadedImagesRef.current.has(image.url)) continue;
      const { props } = getImageProps({
        alt: "",
        fill: true,
        sizes: "(max-width: 768px) 100vw, 90vw",
        src: image.url,
      });
      const preload = new window.Image();
      preload.sizes = props.sizes ?? "";
      preload.srcset = props.srcSet ?? "";
      preload.src = props.src;
      preloadedImagesRef.current.add(image.url);
      if (preloadedImagesRef.current.size > 4) {
        const oldest = preloadedImagesRef.current.values().next().value;
        if (oldest) preloadedImagesRef.current.delete(oldest);
      }
    }
  }, [activeIndex, images]);

  useEffect(() => {
    if (activeIndex === null) return;

    const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      closeButtonRef.current?.focus();

      function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
          closeGallery();
        } else if (event.key === "ArrowLeft" && images.length > 1) {
          event.preventDefault();
          navigate(-1);
        } else if (event.key === "ArrowRight" && images.length > 1) {
          event.preventDefault();
          navigate(1);
        }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, images.length, navigate]);

  function openImage(index: number, opener: HTMLElement) {
    openerRef.current = opener;
    setActiveIndex(index);
  }

  function closeGallery() {
    setActiveIndex(null);
    requestAnimationFrame(() => openerRef.current?.focus());
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (images.length < 2 || event.button !== 0) return;
    pointerStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: null };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = pointerStartRef.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (start.horizontal === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      start.horizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (start.horizontal) {
      if (Math.abs(dx) > 8) dragOccurredRef.current = true;
      dragOffsetRef.current = dx;
      setDragOffset(dx);
      setIsDragging(true);
    }
  }

  function finishPointer(event: React.PointerEvent<HTMLDivElement>, cancelled = false) {
    const start = pointerStartRef.current;
    if (!start || start.id !== event.pointerId) return;
    pointerStartRef.current = null;
    setIsDragging(false);
    if (cancelled) {
      dragOccurredRef.current = false;
      suppressClickUntilRef.current = 0;
    } else if (dragOccurredRef.current) {
      suppressClickUntilRef.current = Date.now() + 400;
      dragOccurredRef.current = false;
    }
    const width = event.currentTarget.clientWidth;
    if (!cancelled && Math.abs(dragOffsetRef.current) >= Math.max(48, width * 0.12)) {
      navigate(dragOffsetRef.current < 0 ? 1 : -1);
    } else {
      setDragOffset(0);
      dragOffsetRef.current = 0;
    }
  }

  function suppressDragClick(event: React.MouseEvent<HTMLDivElement>) {
    if (Date.now() > suppressClickUntilRef.current) {
      suppressClickUntilRef.current = 0;
      return;
    }
    suppressClickUntilRef.current = 0;
    event.preventDefault();
    event.stopPropagation();
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
           className={secondaryImages.length > 0 ? "group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-lg bg-muted text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:aspect-auto" : "absolute inset-0 block size-full cursor-zoom-in text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring"}
          onClick={(event) => openImage(0, event.currentTarget)}
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
                 onClick={(event) => openImage(index + 1, event.currentTarget)}
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
          onClickCapture={suppressDragClick}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeGallery();
          }}
          role="dialog"
        >
          <button
            aria-label="Cerrar galería"
             className="absolute right-4 top-4 z-10 inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
             onClick={closeGallery}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>

          <div
            className={`relative h-[min(78vh,720px)] w-full max-w-7xl touch-pan-y select-none ${images.length > 1 ? "cursor-grab" : ""} ${isDragging ? "cursor-grabbing" : ""}`}
            onDragStart={(event) => event.preventDefault()}
            onPointerCancel={(event) => finishPointer(event, true)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => finishPointer(event)}
          >
            <Image alt={`${imageAlt}, imagen ${(activeIndex ?? 0) + 1}`} className={`object-contain ${isDragging ? "" : "transition-[transform,opacity] duration-[220ms] ease-out motion-reduce:transition-none"}`} draggable={false} fill priority sizes="(max-width: 768px) 100vw, 90vw" src={activeImage.url} style={{ transform: `translate3d(${dragOffset * 0.72 + entryOffset}px, 0, 0)`, opacity: Math.max(0.55, 1 - Math.abs(dragOffset) / 600) }} />
          </div>

          {images.length > 1 ? (
            <>
                <button aria-label="Imagen anterior" className="absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-6" onClick={() => navigate(-1)} type="button">
                <ChevronLeft aria-hidden="true" className="size-6" />
              </button>
                <button aria-label="Imagen siguiente" className="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6" onClick={() => navigate(1)} type="button">
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
