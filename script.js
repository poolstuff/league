document.addEventListener("DOMContentLoaded", () => {
    initializeScheduleTooltips();
    initializeInteractiveLinks();
});

/* =========================================
   SCHEDULE TOOLTIPS
========================================= */

function initializeScheduleTooltips() {

    const cells = document.querySelectorAll(".match-cell");

    // Mobile / touch support
    cells.forEach(cell => {

        cell.addEventListener("click", e => {

            // Skip desktops/laptops with hover support
            if (window.matchMedia("(hover: hover)").matches) {
                return;
            }

            e.stopPropagation();

            // Close all other open tooltips
            cells.forEach(c => {
                if (c !== cell) {
                    c.classList.remove("active");
                }
            });

            // Toggle current tooltip
            cell.classList.toggle("active");
        });
    });

    // Clicking outside closes all tooltips
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

    const containers =
        document.querySelectorAll(".interactive-container");

    containers.forEach(container => {

        const mainText =
            container.querySelector(".main-text");

        const linksWrapper =
            container.querySelector(".links-wrapper");

        if (!mainText || !linksWrapper) return;

        mainText.addEventListener("click", e => {

            // Skip desktops/laptops with hover support
            if (window.matchMedia("(hover: hover)").matches) {
                return;
            }

            e.stopPropagation();

            // Close all other open menus
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

    // Clicking outside closes all menus
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