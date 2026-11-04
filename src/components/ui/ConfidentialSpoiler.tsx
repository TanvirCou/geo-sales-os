"use client";

import React, { useEffect, useState } from "react";
import { Spoiler } from "spoiled";
import { useTheme } from "@/components/theme/ThemeContext";

interface ConfidentialSpoilerProps {
  children: React.ReactNode;
  /** When true, content is hidden behind the animated spoiler */
  hidden?: boolean;
  /** Initial hidden state when uncontrolled */
  defaultHidden?: boolean;
  /** Callback when user clicks to toggle */
  onToggle?: () => void;
  /** Custom className */
  className?: string;
  /** Accent color for particles (e.g. emerald, blue, purple) */
  accentColor?: string;
  /** Custom tooltip hint */
  hint?: string;
}

export default function ConfidentialSpoiler({
  children,
  hidden: controlledHidden,
  defaultHidden = true,
  onToggle,
  className = "",
  accentColor,
  hint,
}: ConfidentialSpoilerProps) {
  const { theme } = useTheme();
  const [internalHidden, setInternalHidden] = useState(defaultHidden);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isHidden = controlledHidden !== undefined ? controlledHidden : internalHidden;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggle) {
      onToggle();
    } else {
      setInternalHidden((prev) => !prev);
    }
  };

  // During SSR or initial mount, render a smooth frosted blur fallback
  if (!mounted) {
    return (
      <span
        className={`inline-block transition-all select-none ${
          defaultHidden ? "filter blur-sm select-none opacity-60" : ""
        } ${className}`}
      >
        {children}
      </span>
    );
  }

  const activeTheme = theme === "light" ? "light" : "dark";

  return (
    <span
      onClick={handleClick}
      title={
        hint ||
        (isHidden
          ? "Click to reveal sensitive figure • গোপন তথ্য দেখতে ক্লিক করুন"
          : "Click to hide figure • গোপন করতে ক্লিক করুন")
      }
      className={`inline-flex items-center cursor-pointer select-none rounded-lg transition-transform active:scale-95 ${
        isHidden ? "hover:opacity-90" : ""
      } ${className}`}
    >
      <Spoiler
        hidden={isHidden}
        revealOn={false} // Handled by our wrapper onClick so it toggles both ways
        transition="fade"
        theme={activeTheme}
        accentColor={accentColor}
        className="rounded-md"
      >
        {children}
      </Spoiler>
    </span>
  );
}
