// ToC Mobile Menu — project-level override with null-safety
// The custom baseof.html uses Bootstrap collapse instead of dropdown,
// so 'toc-dropdown-btn' does not exist in the DOM. Without these guards
// the original theme script crashes and prevents Prism from loading.
const scrollArea = document.getElementById('content');
const tocBtn = document.getElementById('toc-dropdown-btn');

if (scrollArea && tocBtn) {
    scrollArea.addEventListener("activate.bs.scrollspy", function(){
        var currentItem = document.querySelector('.dropdown-menu li > a.active');
        if (currentItem) {
            tocBtn.innerHTML = currentItem.innerHTML;
        }
    });

    tocBtn.addEventListener('shown.bs.dropdown', event => {
        tocBtn.style.borderBottom = 'none';
        tocBtn.style.borderRadius = '4px 4px 0 0';
    });

    tocBtn.addEventListener('hidden.bs.dropdown', event => {
        tocBtn.style.borderBottom = '1px solid var(--alert-border-color)';
        tocBtn.style.borderRadius = '4px';
    });
}
