/* === Logique du calculateur === */
/* Implémentation du Modèle québécois 2026 — formulaire SJ-786, Parties 3 à 6 */

document.addEventListener('DOMContentLoaded', function() {

  const form = document.getElementById('calc-form');
  const resultPanel = document.getElementById('result-panel');
  const resultContent = document.getElementById('result-content');
  const modeGardeSelect = document.getElementById('mode-garde');
  const fieldPctTemps = document.getElementById('field-pct-temps');
  const fieldPctPartage = document.getElementById('field-pct-partage');
  const btnPrint = document.getElementById('btn-print');
  const btnReset = document.getElementById('btn-reset');

  function updateGardeFields() {
    const mode = modeGardeSelect.value;
    fieldPctTemps.style.display = (mode === 'visite-mere' || mode === 'visite-pere') ? 'block' : 'none';
    fieldPctPartage.style.display = (mode === 'partagee') ? 'block' : 'none';
  }
  modeGardeSelect.addEventListener('change', updateGardeFields);
  updateGardeFields();

  function fmt(amount) {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency', currency: 'CAD',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(Math.round(amount));
  }
  function fmtPct(pct) {
    return new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 1 }).format(pct) + ' %';
  }

  function calculer(inputs) {
    const D = TABLE_FIXATION_2026.deductionBase;

    // Partie 3 : Revenu disponible par parent
    const revenuDispoPere = Math.max(0, inputs.revenuPere - D - inputs.cotisSyndPere - inputs.cotisProfPere);
    const revenuDispoMere = Math.max(0, inputs.revenuMere - D - inputs.cotisSyndMere - inputs.cotisProfMere);
    const revenuDispoTotal = revenuDispoPere + revenuDispoMere;

    if (revenuDispoTotal === 0) {
      return { erreur: 'Les revenus disponibles des deux parents sont nuls après déduction de base. Aucune pension applicable.' };
    }

    const facteurPere = revenuDispoPere / revenuDispoTotal;
    const facteurMere = revenuDispoMere / revenuDispoTotal;

    // Partie 4 : Contribution de base
    const contributionBase = getContributionBase(revenuDispoTotal, inputs.nombreEnfants);
    const contributionPere = contributionBase * facteurPere;
    const contributionMere = contributionBase * facteurMere;

    // Frais particuliers (article 9)
    const totalFrais = inputs.fraisGarde + inputs.fraisEtudes + inputs.fraisAutres;
    const fraisPere = totalFrais * facteurPere;
    const fraisMere = totalFrais * facteurMere;

    // Partie 5 : Calcul selon mode de garde
    let pensionBrute = 0, payeur = null, gardien = null, detailGarde = '';

    switch (inputs.modeGarde) {
      case 'exclusive-pere':
        pensionBrute = (contributionBase + totalFrais) * facteurMere;
        payeur = 'mere'; gardien = 'pere';
        detailGarde = 'Garde exclusive au père. La mère verse sa part au père (Section 1 du formulaire).';
        break;
      case 'exclusive-mere':
        pensionBrute = (contributionBase + totalFrais) * facteurPere;
        payeur = 'pere'; gardien = 'mere';
        detailGarde = 'Garde exclusive à la mère. Le père verse sa part à la mère (Section 1 du formulaire).';
        break;
      case 'visite-pere': {
        const pctTemps = inputs.pctTemps;
        const compensation = ((pctTemps - 20) / 100) * contributionBase;
        const contribAjustee = contributionBase + totalFrais - compensation;
        pensionBrute = Math.max(0, contribAjustee * facteurMere);
        payeur = 'mere'; gardien = 'pere';
        detailGarde = `Garde principale au père, droit de visite et de sortie prolongé de la mère (${pctTemps} %). Compensation : ${fmt(compensation)} (Section 1.1).`;
        break;
      }
      case 'visite-mere': {
        const pctTemps = inputs.pctTemps;
        const compensation = ((pctTemps - 20) / 100) * contributionBase;
        const contribAjustee = contributionBase + totalFrais - compensation;
        pensionBrute = Math.max(0, contribAjustee * facteurPere);
        payeur = 'pere'; gardien = 'mere';
        detailGarde = `Garde principale à la mère, droit de visite et de sortie prolongé du père (${pctTemps} %). Compensation : ${fmt(compensation)} (Section 1.1).`;
        break;
      }
      case 'partagee': {
        const pctPere = inputs.pctPartage / 100;
        const pctMere = 1 - pctPere;
        const coutGardePere = contributionBase * pctPere;
        const coutGardeMere = contributionBase * pctMere;
        const pensionBasePere = Math.max(0, contributionPere - coutGardePere);
        const pensionBaseMere = Math.max(0, contributionMere - coutGardeMere);

        if (pensionBasePere > 0 && pensionBasePere >= pensionBaseMere) {
          pensionBrute = pensionBasePere + fraisPere;
          payeur = 'pere';
        } else if (pensionBaseMere > 0) {
          pensionBrute = pensionBaseMere + fraisMere;
          payeur = 'mere';
        } else {
          pensionBrute = 0; payeur = null;
        }
        detailGarde = `Garde partagée — père : ${inputs.pctPartage} %, mère : ${100 - inputs.pctPartage} % (Section 3).`;
        break;
      }
    }

    // Partie 6 : Plafond capacité de payer (50 % du revenu disponible du payeur)
    let plafond = Infinity, plafondApplique = false;
    if (payeur === 'pere') plafond = revenuDispoPere * 0.50;
    else if (payeur === 'mere') plafond = revenuDispoMere * 0.50;

    let pensionFinale = pensionBrute;
    if (pensionFinale > plafond) { pensionFinale = plafond; plafondApplique = true; }

    return {
      pensionAnnuelle: pensionFinale,
      pensionMensuelle: pensionFinale / 12,
      pensionHebdomadaire: pensionFinale / 52,
      payeur, gardien,
      breakdown: {
        revenuDispoPere, revenuDispoMere, revenuDispoTotal,
        facteurPere: facteurPere * 100, facteurMere: facteurMere * 100,
        contributionBase, contributionPere, contributionMere,
        totalFrais, fraisPere, fraisMere,
        pensionBrute, plafond, plafondApplique, detailGarde
      }
    };
  }

  function afficherResultat(resultat) {
    if (resultat.erreur) {
      resultContent.innerHTML = `<div class="disclaimer"><strong>Erreur :</strong> ${resultat.erreur}</div>`;
      resultPanel.style.display = 'block';
      resultPanel.scrollIntoView({behavior: 'smooth'});
      return;
    }

    const b = resultat.breakdown;
    const payeurNom = resultat.payeur === 'pere' ? 'Parent A (père)' : (resultat.payeur === 'mere' ? 'Parent B (mère)' : 'Aucun');
    const gardienNom = resultat.gardien === 'pere' ? 'Parent A (père)' : (resultat.gardien === 'mere' ? 'Parent B (mère)' : null);

    let html = `
      <div class="result-main">
        <div class="amount">${fmt(resultat.pensionMensuelle)}</div>
        <div class="period">par mois</div>
        ${resultat.payeur ? `<div class="payer">Versée par <strong>${payeurNom}</strong>${gardienNom ? ` à ${gardienNom}` : ''}</div>` : '<div class="payer">Aucune pension à verser</div>'}
      </div>

      <div class="breakdown">
        <h3>Versements équivalents</h3>
        <table>
          <tr><td>Hebdomadaire</td><td>${fmt(resultat.pensionHebdomadaire)}</td></tr>
          <tr><td>Aux 2 semaines</td><td>${fmt(resultat.pensionAnnuelle / 26)}</td></tr>
          <tr><td>2 fois par mois</td><td>${fmt(resultat.pensionAnnuelle / 24)}</td></tr>
          <tr><td>Mensuelle</td><td>${fmt(resultat.pensionMensuelle)}</td></tr>
          <tr class="total"><td>Annuelle totale</td><td>${fmt(resultat.pensionAnnuelle)}</td></tr>
        </table>
      </div>

      <div class="breakdown">
        <h3>Détail du calcul</h3>
        <table>
          <tr><td>Déduction de base (par parent)</td><td>${fmt(TABLE_FIXATION_2026.deductionBase)}</td></tr>
          <tr><td>Revenu disponible — Parent A (père)</td><td>${fmt(b.revenuDispoPere)}</td></tr>
          <tr><td>Revenu disponible — Parent B (mère)</td><td>${fmt(b.revenuDispoMere)}</td></tr>
          <tr><td>Revenu disponible total</td><td>${fmt(b.revenuDispoTotal)}</td></tr>
          <tr><td>Facteur de répartition — Père</td><td>${fmtPct(b.facteurPere)}</td></tr>
          <tr><td>Facteur de répartition — Mère</td><td>${fmtPct(b.facteurMere)}</td></tr>
          <tr><td>Contribution alimentaire de base (table 2026)</td><td>${fmt(b.contributionBase)}</td></tr>
    `;

    if (b.totalFrais > 0) {
      html += `<tr><td>Total des frais particuliers (article 9)</td><td>${fmt(b.totalFrais)}</td></tr>`;
    }

    html += `<tr><td>Pension brute calculée</td><td>${fmt(b.pensionBrute)}</td></tr>`;

    if (b.plafondApplique) {
      html += `
        <tr><td>Plafond capacité de payer (50 % du revenu dispo. du payeur)</td><td>${fmt(b.plafond)}</td></tr>
        <tr class="total"><td>Pension annuelle finale (plafonnée)</td><td>${fmt(resultat.pensionAnnuelle)}</td></tr>
      `;
    } else {
      html += `<tr class="total"><td>Pension annuelle finale</td><td>${fmt(resultat.pensionAnnuelle)}</td></tr>`;
    }

    html += `
        </table>
      </div>

      <div class="alert-info">
        <strong>Mode de garde appliqué :</strong> ${b.detailGarde}
      </div>
    `;

    if (b.plafondApplique) {
      html += `
        <div class="alert-info">
          <strong>⚠️ Plafond appliqué :</strong> La pension calculée dépassait 50 % du revenu disponible du payeur. La loi prévoit que la pension ne peut excéder ce seuil (Partie 6 du formulaire) — elle a donc été ajustée à la baisse.
        </div>
      `;
    }

    resultContent.innerHTML = html;
    resultPanel.style.display = 'block';
    resultPanel.scrollIntoView({behavior: 'smooth'});
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const inputs = {
      revenuPere: parseFloat(document.getElementById('revenu-pere').value) || 0,
      cotisSyndPere: parseFloat(document.getElementById('cotis-synd-pere').value) || 0,
      cotisProfPere: parseFloat(document.getElementById('cotis-prof-pere').value) || 0,
      revenuMere: parseFloat(document.getElementById('revenu-mere').value) || 0,
      cotisSyndMere: parseFloat(document.getElementById('cotis-synd-mere').value) || 0,
      cotisProfMere: parseFloat(document.getElementById('cotis-prof-mere').value) || 0,
      nombreEnfants: parseInt(document.getElementById('nb-enfants').value) || 1,
      modeGarde: document.getElementById('mode-garde').value,
      pctTemps: parseFloat(document.getElementById('pct-temps').value) || 30,
      pctPartage: parseFloat(document.getElementById('pct-partage').value) || 50,
      fraisGarde: parseFloat(document.getElementById('frais-garde').value) || 0,
      fraisEtudes: parseFloat(document.getElementById('frais-etudes').value) || 0,
      fraisAutres: parseFloat(document.getElementById('frais-autres').value) || 0
    };

    const resultat = calculer(inputs);
    afficherResultat(resultat);

    // GA4 — événement de conversion principal
    if (typeof gtag === 'function') {
      let pensionBracket = 'aucune';
      if (!resultat.erreur && resultat.pensionMensuelle > 0) {
        const m = resultat.pensionMensuelle;
        if (m < 250) pensionBracket = '0-250';
        else if (m < 500) pensionBracket = '250-500';
        else if (m < 750) pensionBracket = '500-750';
        else if (m < 1000) pensionBracket = '750-1000';
        else if (m < 1500) pensionBracket = '1000-1500';
        else pensionBracket = '1500+';
      }
      gtag('event', 'calculator_submitted', {
        mode_garde: inputs.modeGarde,
        nombre_enfants: inputs.nombreEnfants,
        has_frais_particuliers: (inputs.fraisGarde + inputs.fraisEtudes + inputs.fraisAutres) > 0,
        pension_bracket: pensionBracket,
        payeur: resultat.payeur || 'aucun'
      });
    }
  });

  btnPrint.addEventListener('click', function() {
    if (typeof gtag === 'function') {
      gtag('event', 'result_printed');
    }
    window.print();
  });

  btnReset.addEventListener('click', function() {
    if (typeof gtag === 'function') {
      gtag('event', 'result_reset');
    }
    form.reset();
    resultPanel.style.display = 'none';
    updateGardeFields();
    window.scrollTo({top: 0, behavior: 'smooth'});
  });

});
