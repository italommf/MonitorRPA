import { useLocation } from 'react-router-dom';
import { useEffect, useState, cloneElement, isValidElement } from 'react';

export default function PageTransition({ children }) {
    const location = useLocation();
    const [isVisible, setIsVisible] = useState(false);
    const [displayLocation, setDisplayLocation] = useState(location);

    useEffect(() => {
        if (location.pathname !== displayLocation.pathname) {
            // Fade out
            setIsVisible(false);

            // Wait for fade out, then switch content and fade in
            const timer = setTimeout(() => {
                setDisplayLocation(location);
                setIsVisible(true);
            }, 100); // Slightly faster

            return () => clearTimeout(timer);
        }
    }, [location.pathname, displayLocation.pathname]);

    useEffect(() => {
        // Initial fade in
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, []);

    // Inject displayLocation into Routes to prevent content switching before fade
    const renderedChildren = isValidElement(children)
        ? cloneElement(children, { location: displayLocation })
        : children;

    return (
        <div
            className={`transition-opacity duration-200 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'
                }`}
        >
            {renderedChildren}
        </div>
    );
}
