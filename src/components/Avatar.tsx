import React, { useState, useEffect, memo } from "react";
import { UserAvailability } from "../types";

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  first?: string;
  last?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  border?: boolean;
  borderColor?: string;
  availability?: UserAvailability;
  showStatus?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement | HTMLImageElement>) => void;
}

export const Avatar: React.FC<AvatarProps> = memo(({
  src,
  alt = "User Avatar",
  name,
  first,
  last,
  size = "md",
  className = "",
  border = true,
  borderColor,
  availability,
  showStatus = false,
  onClick
}) => {
  const [imgError, setImgError] = useState(false);

  // Reset imgError if src changes
  useEffect(() => {
    setImgError(false);
  }, [src]);

  // Determine size dimensions
  let sizeClass = "w-9 h-9 text-xs"; // default md
  let sizePx: number | null = null;

  if (typeof size === "number") {
    sizePx = size;
  } else {
    switch (size) {
      case "xs":
        sizeClass = "w-5 h-5 text-[9px]";
        break;
      case "sm":
        sizeClass = "w-7 h-7 text-[10px]";
        break;
      case "md":
        sizeClass = "w-9 h-9 text-xs";
        break;
      case "lg":
        sizeClass = "w-12 h-12 text-sm";
        break;
      case "xl":
        sizeClass = "w-20 h-20 text-lg";
        break;
    }
  }

  // Derive initials
  let initials = "";
  if (first || last) {
    const f = first?.[0] || "";
    const l = last?.[0] || "";
    initials = `${f}${l}`.toUpperCase();
  }
  
  if (!initials && name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      initials = `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    } else if (parts[0]) {
      initials = parts[0].substring(0, 2).toUpperCase();
    }
  }

  if (!initials) {
    initials = "U";
  }

  const borderStyle = border
    ? { border: `1px solid ${borderColor || "var(--color-accent-subtle, rgba(200, 146, 42, 0.3))"}` }
    : {};

  const styleObj: React.CSSProperties = {
    ...borderStyle,
    ...(sizePx ? { width: `${sizePx}px`, height: `${sizePx}px` } : {})
  };

  const containerClasses = `relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden aspect-square select-none ${
    sizePx ? "" : sizeClass
  } ${className}`;

  // Availability Badge styling
  let statusBg = "bg-emerald-500";
  let statusTitle = "Available";
  if (availability) {
    switch (availability) {
      case 'busy':
        statusBg = "bg-rose-500";
        statusTitle = "Busy";
        break;
      case 'in_meeting':
        statusBg = "bg-purple-500";
        statusTitle = "In a meeting";
        break;
      case 'on_call':
        statusBg = "bg-blue-500";
        statusTitle = "On a call";
        break;
      case 'do_not_disturb':
        statusBg = "bg-rose-600";
        statusTitle = "Do not disturb";
        break;
      case 'away':
        statusBg = "bg-amber-500";
        statusTitle = "Away";
        break;
      case 'offline':
        statusBg = "bg-slate-400";
        statusTitle = "Offline";
        break;
      default:
        statusBg = "bg-emerald-500";
        statusTitle = "Available";
    }
  }

  const renderAvatarContent = () => {
    if (src && !imgError) {
      return (
        <img
          src={src}
          alt={alt || name || "Avatar"}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          style={styleObj}
          onClick={onClick}
          className={`${containerClasses} object-cover ${onClick ? "cursor-pointer" : ""}`}
        />
      );
    }

    return (
      <div
        onClick={onClick}
        style={{
          ...styleObj,
          background: "var(--grad-warm-highlight, linear-gradient(135deg, #c8922a 0%, #e05c6e 100%))",
          color: "var(--color-text-inverse, #ffffff)"
        }}
        className={`${containerClasses} font-black tracking-wider ${onClick ? "cursor-pointer" : ""}`}
        title={alt || name || `${first || ""} ${last || ""}`.trim()}
      >
        {initials}
      </div>
    );
  };

  if (availability || showStatus) {
    return (
      <div className="relative inline-block shrink-0">
        {renderAvatarContent()}
        <span
          className={`absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full ring-2 ring-[var(--color-surface-1, #ffffff)] ${statusBg}`}
          title={`Status: ${statusTitle}`}
          aria-label={`Status: ${statusTitle}`}
        />
      </div>
    );
  }

  return renderAvatarContent();
});

Avatar.displayName = "Avatar";
