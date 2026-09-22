"use client";

import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";

type PublicRevealProps = Omit<HTMLAttributes<HTMLElement>, "children" | "className"> & {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
};

export function PublicReveal({ children, className, as = "div", ...props }: PublicRevealProps) {
  const elementRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    setIsReady(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8%" },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const revealClassName = `public-reveal${isReady ? " public-reveal-ready" : ""}${isVisible ? " public-reveal-visible" : ""}${className ? ` ${className}` : ""}`;

  if (as === "section") {
    return <section className={revealClassName} ref={(element) => { elementRef.current = element; }} {...props}>{children}</section>;
  }

  return <div className={revealClassName} ref={(element) => { elementRef.current = element; }} {...props}>{children}</div>;
}
