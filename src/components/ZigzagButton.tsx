import { useRef, useEffect, useMemo } from 'react';
import { gsap } from 'gsap';

interface ZigzagButtonProps {
    children: React.ReactNode;
    onClick: () => void;
    className?: string;
    el?: 'button' | 'a';
    href?: string;
    target?: string;
}

export default function ZigzagButton({
    children,
    onClick,
    className = "",
    el = 'button',
    href,
    target
}: ZigzagButtonProps) {
    const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
    const timelineRef = useRef<gsap.core.Timeline | null>(null);

    const colors = useMemo(() => ['#EE4E2B', '#F3BE21', '#009563', '#F7D9D3', '#5266AB'], []);

    useEffect(() => {
        const button = buttonRef.current;
        if (!button) return;

        // Only target actual letter spans (exclude gap spacers)
        const letters = button.querySelectorAll('span[data-char="true"]');

        const handleMouseEnter = () => {
            if (timelineRef.current) timelineRef.current.kill();

            let tick = 0;

            // set immediately on hover
            gsap.set(letters, { color: (i) => colors[(i + tick) % colors.length] });

            timelineRef.current = gsap.timeline({ repeat: -1 });
            timelineRef.current.to({}, {
                duration: 0,
                repeat: -1,
                repeatDelay: 0.2,
                onRepeat: () => {
                    tick = (tick + 1) % colors.length;
                    gsap.set(letters, { color: (i) => colors[(i + tick) % colors.length] });
                }
            });
        };
        const handleMouseLeave = () => {
            if (timelineRef.current) {
                timelineRef.current.kill();
            }

            // Reset to inherit color
            gsap.set(letters, { color: 'inherit' });
        };

        button.addEventListener('mouseenter', handleMouseEnter);
        button.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            if (timelineRef.current) {
                timelineRef.current.kill();
            }
            button.removeEventListener('mouseenter', handleMouseEnter);
            button.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [colors]);

    const styles = {
        fontFamily: 'Freigeist, sans-serif',
        lineHeight: '1',
    };

    const zigzagStyle = {
        display: 'inline-flex', // ensures consistent vertical box
        alignItems: 'flex-end', // align letters to baseline visually
        position: 'relative' as const,
        backgroundImage: 'repeating-linear-gradient(to right, currentColor 0 6px, transparent 6px 12px)',
        backgroundRepeat: 'repeat-x' as const,
        backgroundPosition: '0 100%' as const,
        backgroundSize: 'auto 2px',
    };

    // Split text into individual letters for animation while preserving spaces
    const renderAnimatedText = (text: string) => {
        const parts = text.split(/(\s+)/); // keep spaces as separate tokens
        return parts.map((segment, i) => {
            if (/^\s+$/.test(segment)) {
                // Render a fixed-width spacer so words stay visually separated in flex context
                return <span key={`gap-${i}`} aria-hidden="true" style={{ display: 'inline-block', width: '0.5ch' }} />;
            }
            return segment.split('').map((char, j) => (
                <span
                    key={`c-${i}-${j}`}
                    data-char="true"
                    style={{ display: 'inline-block', lineHeight: '1em' }}
                >
                    {char}
                </span>
            ));
        });
    };

    const commonProps = {
        onClick,
        style: {
            ...zigzagStyle,
            border: 'none',
            padding: '0 0 0.05em 0', // tighter baseline padding
            margin: '0',
            cursor: 'pointer',
            ...styles
        },
        className: `zigzag-button ${className}`
    };

    const content = typeof children === 'string' ? renderAnimatedText(children) : children;

    if (el === 'a') {
        if (!href) {
            console.warn('ZigzagButton: href is required when el="a"');
        }
        return (
            <a {...commonProps} href={href} target={target} ref={buttonRef as React.RefObject<HTMLAnchorElement>}>
                {content}
            </a>
        );
    }

    return (
        <button {...commonProps} ref={buttonRef as React.RefObject<HTMLButtonElement>}>
            {content}
        </button>
    );
}
