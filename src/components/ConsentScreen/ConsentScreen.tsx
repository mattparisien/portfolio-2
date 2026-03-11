import { useEffect, useRef } from "react";
import Logo from "../Logo";
import gsap from "gsap";

interface ConsentScreenProps {
    onAnimationComplete?: () => void;
}

const ConsentScreen = ({ onAnimationComplete }: ConsentScreenProps) => {
    const logoRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!logoRef.current) return;


        const paths = logoRef.current.querySelectorAll("path");
        const { width, height } = logoRef.current.getBoundingClientRect();

        gsap.set(logoRef.current, {
            x: window.innerWidth / 2 - width / 2,
            y: window.innerHeight / 2 - height / 2,
        });

        gsap.set(paths, {
            y: "110%",
        });

        gsap.timeline().to(paths, {
            y: "0%",
            stagger: 0.1,
            ease: "expo.inOut",
            duration: 1,
        }).then(() => {
            onAnimationComplete?.();
        });
    }, [])

    return <div className="w-screen h-screen fixed top-0 left-0 z-1 bg-[#0BA384] p-4 flex">
        <div className=""></div>
        <div className="text-[2.5vw] leading-[1.2]" style={{
            '-webkit-font-smoothing': 'antialiased',
            '-moz-osx-font-smoothing': 'grayscale',
            fontFamily: "Politip"
        }}>
            <Logo ref={logoRef} className="w-[60vw] absolute top-0 left-0 overflow-hidden" />
            {/* Welcome to Crumb. Crumb is an collaborative infinite canvas for the queer community. As a contributor you are free to create and share content on the canvas, but you are also responsible for the content you create. By using Crumb, you agree to our terms of service and privacy policy. Please be respectful of others and do not create or share content that is harmful, offensive, or illegal. If you have any questions or concerns, please contact us at */}
        </div>
    </div>
}

export default ConsentScreen;