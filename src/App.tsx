import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SmoothScroll from './components/SmoothScroll';

// Below-the-fold components are lazy loaded
const IphoneReveal = lazy(() => import('./components/IphoneReveal'));
const Showcase = lazy(() => import('./components/Showcase'));
const CallToAction = lazy(() => import('./components/CallToAction'));

function App() {
    const [showNavbar, setShowNavbar] = useState(false);

    // Lock scroll during intro
    useEffect(() => {
        window.scrollTo(0, 0);

        if (!showNavbar) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [showNavbar]);

    const handleIntroComplete = useCallback(() => {
        setShowNavbar(true);
    }, []);

    return (
        <div className="bg-black min-h-screen text-foreground font-sans selection:bg-cyan-500/30">
            <SmoothScroll isLocked={!showNavbar} />
            <Navbar visible={showNavbar} />
            <Hero onIntroComplete={handleIntroComplete} />

            <main
                className={`relative transition-opacity duration-1000 ease-out will-change-opacity ${showNavbar ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
            >
                <Suspense fallback={<div className="h-screen bg-black" />}>
                    <IphoneReveal />
                    <Showcase />
                    <CallToAction />
                </Suspense>
            </main>
        </div>
    )
}

export default App
