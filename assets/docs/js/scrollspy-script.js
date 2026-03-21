//ScrollSpy - via https://github.com/kimyvgy/simple-scrollspy
window.onload = function () {
    scrollSpy('toc', {
        sectionClass: 'h1,h2,h3,h4',
        //   menuActiveTarget: 'href',
        offset: 100,
        // scrollContainer: null,
    });

    // Hotfix: Force Scrollspy to highlight the final TOC element when scrolling hits the absolute bottom
    window.addEventListener('scroll', function() {
        // Evaluate if the viewport has scrolled to the bottom using strict scrollHeight
        const isAtBottom = Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 10;
        
        if (isAtBottom) {
            const tocLinks = document.querySelectorAll('#toc a');
            if (tocLinks.length > 0) {
                setTimeout(() => {
                    tocLinks.forEach(link => link.classList.remove('active'));
                    tocLinks[tocLinks.length - 1].classList.add('active');
                }, 10);
            }
        }
    }, { passive: true });
}
