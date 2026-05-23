document.addEventListener("DOMContentLoaded", () => {
    initializeScheduleTooltips();
    initializeInteractiveLinks();
});

/* =========================================
   SCHEDULE TOOLTIPS
========================================= */

function initializeScheduleTooltips() {

    const cells = document.querySelectorAll(".match-cell");

    // MOBILE TAP SUPPORT
    cells.forEach(cell => {
        cell.addEventListener("click", e => {

            // Only mobile/tablet
            if (window.innerWidth > 768) return;

            e.stopPropagation();

            // Close all others
            cells.forEach(c => {
                if (c !== cell) {
                    c.classList.remove("active");
                }
            });

            // Toggle current
            cell.classList.toggle("active");
        });
    });

    // Click outside closes tooltip
    document.addEventListener("click", () => {
        cells.forEach(cell => {
            cell.classList.remove("active");
        });
    });
}

/* =========================================
   INTERACTIVE MENU LINKS
========================================= */

function initializeInteractiveLinks() {

    const containers = document.querySelectorAll(".interactive-container");

    containers.forEach(container => {

        const mainText = container.querySelector(".main-text");
        const linksWrapper = container.querySelector(".links-wrapper");

        if (!mainText || !linksWrapper) return;

        mainText.addEventListener("click", e => {

            // Desktop already uses CSS hover
            if (window.innerWidth > 975) return;

            e.stopPropagation();

            // Close other open menus
            containers.forEach(c => {
                if (c !== container) {

                    const otherWrapper =
                        c.querySelector(".links-wrapper");

                    if (otherWrapper) {
                        otherWrapper.classList.remove("show-links");
                    }
                }
            });

            // Toggle current menu
            linksWrapper.classList.toggle("show-links");
        });
    });

    // Click outside closes menus
    document.addEventListener("click", () => {

        containers.forEach(container => {

            const wrapper =
                container.querySelector(".links-wrapper");

            if (wrapper) {
                wrapper.classList.remove("show-links");
            }
        });
    });
}