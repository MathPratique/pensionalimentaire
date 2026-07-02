# pensionalimentaire.ca

Calculateur officiel de pension alimentaire pour enfants — Modèle québécois 2026.

## À propos

Site informatif et calculateur gratuit basé sur le **Modèle québécois de fixation des pensions alimentaires pour enfants**, applicable à compter du 1er janvier 2026, conformément à l'Annexe I du Règlement.

## Structure

```
pensionalimentaire/
├── index.html              Page d'accueil + FAQ + capture email + CTA affiliation
├── calculateur.html        Calculateur interactif (formulaire SJ-786, Parties 3-6)
├── methodologie.html       Sources officielles + disclaimer juridique
├── 404.html                Page d'erreur custom
├── css/style.css           Styles (mobile-first, responsive)
├── js/table-2026.js        Table officielle de fixation (Annexe I 2026)
├── js/calculateur.js       Logique de calcul + interactions formulaire
├── CNAME                   Domaine custom pour GitHub Pages
└── README.md               Ce fichier
```

## Stack

Pure HTML + CSS + JavaScript vanilla. Aucun build step, aucune dépendance npm.

## Sources officielles

- [Justice Québec — Pension alimentaire pour enfants](https://www.justice.gouv.qc.ca/couple-et-famille/separation-et-divorce/la-pension-alimentaire-pour-enfants/)
- [LégisQuébec — Règlement sur la fixation des pensions alimentaires pour enfants](https://www.legisquebec.gouv.qc.ca/)
- [Éducaloi](https://educaloi.qc.ca/)
- Formulaire SJ-786 (Annexe I — Formulaire de fixation des pensions alimentaires pour enfants)

## Avertissement

Les résultats du calculateur sont **indicatifs**. Pour une démarche officielle, utiliser le formulaire SJ-786 et consulter un avocat en droit familial.

## Déploiement

Hébergé sur GitHub Pages. DNS pointé via OVH vers `mathpratique.github.io` (le repo où vit ce site).
