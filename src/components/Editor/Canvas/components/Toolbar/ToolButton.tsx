"use client";

import classNames from "classnames";
import type { RefObject } from "react";
import { ChevronUpIcon } from "../Icons";
import { ICON_BTN_PADDING_CLASS } from "./toolConfig";

interface ToolButtonProps {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  btnRef?: RefObject<HTMLButtonElement | null>;
  disabled?: boolean;
  ariaExpanded?: boolean;
  activeClass?: string;
  extraClass?: string;
  paddingClass?: string;
}

export function ToolButton({
  active,
  onClick,
  title,
  children,
  btnRef,
  disabled,
  ariaExpanded,
  activeClass = "bg-overlay-active-bg text-overlay-active-fg",
  extraClass,
  paddingClass = ICON_BTN_PADDING_CLASS,
}: ToolButtonProps) {
  return (
    <button
      ref={btnRef}
      title={title}
      aria-label={title}
      aria-expanded={ariaExpanded}
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "flex items-center justify-center transition-colors cursor-pointer", 
        {
          [activeClass]: active,
          "hover:bg-overlay-hover-bg": !active,
          "disabled:opacity-50 disabled:cursor-not-allowed": disabled,
          [extraClass ?? ""]: !!extraClass,
          [paddingClass]: !!paddingClass,
        }
      )}
    >
      
      {children}
    </button>
  );
}

interface ArrowButtonProps {
  open: boolean;
  onClick: () => void;
  ariaLabel: string;
}

export function ArrowButton({ open, onClick, ariaLabel }: ArrowButtonProps) {
  return (
    <button
      title={ariaLabel}
      aria-label={ariaLabel}
      aria-expanded={open}
      onClick={onClick}
      className={classNames(
        "rounded-md flex items-center justify-center transition-colors cursor-pointer px-1 py-2 text-[#111]",
        {
          "bg-black/[0.08]": open,
          "hover:bg-black/[0.07]": !open,
        }
      )}
    >
      <ChevronUpIcon
        svgClassName={`h-[30px] w-1.5 transition-transform duration-150 ${open ? "" : "rotate-180"}`}
        pathClassName="stroke-black stroke-1"
      />
    </button>
  );
}
