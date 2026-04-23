// KRON AI - Interactive Logic (2026 Edition)

document.addEventListener('DOMContentLoaded', () => {

    // --- Scroll Reveal Logic (Fade-ins) ---
    const fadeElements = document.querySelectorAll('.fade-in');
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const fadeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    fadeElements.forEach(element => {
        fadeObserver.observe(element);
    });

    // --- Side Nav Logic (Active Dot Update) ---
    const sections = document.querySelectorAll('section');
    const navDots = document.querySelectorAll('.nav-dot');

    const navOptions = {
        root: null,
        rootMargin: '-50% 0px -50% 0px', // Trigger when section is in the middle 20% of viewport
        threshold: 0
    };

    const navObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.getAttribute('id');

                navDots.forEach(dot => {
                    dot.classList.remove('active');
                    if (dot.getAttribute('href') === `#${sectionId}`) {
                        dot.classList.add('active');
                    }
                });
            }
        });
    }, navOptions);

    sections.forEach(section => {
        navObserver.observe(section);
    });

    // --- FAQ Accordion Logic ---
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const header = item.querySelector('.faq-header');

        header.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close all other items (optional, but cleaner)
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });

            // Toggle current item
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // --- Feedbacks Ticker (Embla Carousel) ---
    const emblaNode = document.getElementById('feedbacksEmbla');
    if (emblaNode) {
        const options = { loop: true, dragFree: true, align: 'start' };

        // Use AutoScroll plugin
        const autoScroll = EmblaCarouselAutoScroll({
            playOnInit: true,
            speed: 1,
            stopOnInteraction: false,
            startDelay: 0
        });

        const emblaApi = EmblaCarousel(emblaNode, options, [autoScroll]);

        // Pause/Resume on pointer enter/leave (Desktop Experience)
        emblaNode.addEventListener('mouseenter', () => autoScroll.stop());
        emblaNode.addEventListener('mouseleave', () => autoScroll.play());
    }
});
