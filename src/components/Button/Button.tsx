import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  href: string;
}

/**
 * Inline anchor styled as an underlined text link.
 * Used inside prose paragraphs on the home page.
 */
const Button = ({ children, href }: ButtonProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="underline decoration-1 sm:decoration-2 underline-offset-3 cursor-pointer"
  >
    {children}
  </a>
);

export default Button;
