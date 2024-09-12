document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('prediction-form');
    const resultsContainer = document.getElementById('results-container');

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);

        fetch('/predict', {
            method: 'POST',
            body: new URLSearchParams(formData)
        })
        .then(response => response.text()) // Expect HTML response
        .then(html => {
            resultsContainer.innerHTML = html;
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
});
