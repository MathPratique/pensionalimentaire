/* === Tracking des CTAs vers le calculateur === */
/* Fire event calculator_cta_click quand un utilisateur clique sur un lien vers /calculateur.html */

document.addEventListener('DOMContentLoaded', function() {
  // Sélectionne tous les liens pointant vers le calculateur
  const ctaLinks = document.querySelectorAll('a[href="/calculateur.html"], a[href="calculateur.html"]');

  ctaLinks.forEach(function(link) {
    link.addEventListener('click', function() {
      if (typeof gtag === 'function') {
        gtag('event', 'calculator_cta_click', {
          source_page: window.location.pathname,
          cta_text: link.textContent.trim().substring(0, 100)
        });
      }
    });
  });
});
