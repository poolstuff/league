document.querySelectorAll('.main-text').forEach(header => {
    header.addEventListener('click', function (e) {
        e.stopPropagation();

        const currentWrapper = this.closest('.interactive-container')
            .querySelector('.links-wrapper');

        // Close others
        document.querySelectorAll('.links-wrapper').forEach(wrapper => {
            if (wrapper !== currentWrapper) {
                wrapper.classList.remove('show-links');
            }
        });

        // Toggle current
        currentWrapper.classList.toggle('show-links');
    });
});

// Close dropdowns when clicking outside the interactive container
document.addEventListener('click', (e) => {
    if (!e.target.closest('.interactive-container')) {
        document.querySelectorAll('.links-wrapper').forEach(wrapper => {
            wrapper.classList.remove('show-links');
        });
    }
});