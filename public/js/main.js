document.addEventListener('DOMContentLoaded', () => {
  const deleteForms = document.querySelectorAll('.confirm-delete');
  deleteForms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (!confirm('Are you sure you want to delete this record?')) {
        event.preventDefault();
      }
    });
  });
});
