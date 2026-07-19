/* === Tracking des CTAs vers le calculateur === */
/* Fire event calculator_cta_click quand un utilisateur clique sur un lien tagué .calculator-cta
   (vrais CTAs dans le body des articles/pages, excluant les liens nav header/footer). */

document.addEventListener('DOMContentLoaded', function() {
  // Sélectionne uniquement les vrais CTAs vers le calculateur (classe explicite)
  const ctaLinks = document.querySelectorAll('a.calculator-cta');

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
