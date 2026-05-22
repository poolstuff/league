document.addEventListener("DOMContentLoaded", () => {
    initializeScheduleTooltips();
});

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