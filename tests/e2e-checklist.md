# Checklist E2E — Parcours de génération de leads

**Objectif** : valider le parcours complet du lead depuis les CTAs jusqu'à la soumission Formspree, en incluant le tracking GA4 et la conformité Loi 25.

**Dernière mise à jour** : 2026-07-17

---

## ⚠️ À lire avant de commencer

### Comportement actuel du code — timing de `lead_form_submitted`

Le code de `consultation.html` (lignes 389-436) fire l'événement `lead_form_submitted` **UNIQUEMENT** si le fetch vers Formspree répond avec un statut 2xx. Regarde :

```js
const response = await fetch(form.action, { method: 'POST', body: formData, ... });
if (response.ok) {
  gtag('event', 'lead_form_submitted', { ... });   // ← ne fire QUE si ok
  // afficher succès
} else {
  throw new Error(...)   // → tombe dans le catch → alert d'erreur
}
```

**Impact sur Phase A** : puisque l'endpoint est encore `YOUR_FORM_ID` (invalide), Formspree va répondre 4xx. **L'événement `lead_form_submitted` ne sera PAS envoyé en Phase A.** Une alerte "Une erreur est survenue lors de l'envoi..." va s'afficher à la place.

**Options** :
- **(A) Test partiel Phase A** : accepter que `lead_form_submitted` ne peut être validé qu'en Phase B, et se contenter en Phase A de valider `lead_form_started` + les validations HTML5 + le CTA source tracking.
- **(B) Modifier le code** pour fire `lead_form_submitted` AVANT le fetch. Ça permet de tester complètement en Phase A, mais compte les tentatives (même échouées) comme conversions en production — pas idéal si Formspree a occasionnellement des ratés.

**Recommandation** : Option A. En Phase A on valide tout ce qui est validable côté client. En Phase B on valide le pipeline complet Formspree + GA4.

Voir la section **Correctifs à décider** en bas de ce document.

### Prérequis techniques

- Serveur local en cours : `http://127.0.0.1:8000/`
- Navigateur SANS bloqueur de pubs (voir [gaTestMode.md](./gaTestMode.md) pour les options)
- DevTools ouvert (F12) — onglet Console + Réseau
- GA4 DebugView ouvert dans un autre onglet (voir [gaTestMode.md](./gaTestMode.md))

---

# PHASE A — Tests sans Formspree

## SCÉNARIO 1 — Parcours principal via calculateur

- [ ] Ouvrir `http://127.0.0.1:8000/calculateur.html?debug_mode=1`
- [ ] Faire un calcul complet :
  - Revenus **Marie : 65 000 $**
  - Revenus **Paul : 45 000 $**
  - **2 enfants** à charge
  - **Garde exclusive** à Marie
  - Cliquer **Calculer**
- [ ] Vérifier qu'un bloc **résultat** s'affiche avec un montant chiffré
- [ ] Vérifier qu'un **CTA à fond bleu dégradé** apparaît juste sous le résultat, avec le titre "Vous n'êtes pas d'accord avec ce montant, ou votre situation est particulière ?"
- [ ] Vérifier que le CTA contient le bouton blanc "Parlez à un avocat de votre situation →"
- [ ] Cliquer sur le bouton du CTA
- [ ] Vérifier l'arrivée sur `/consultation.html?debug_mode=1`
- [ ] Ouvrir la **Console DevTools** et taper :
  ```js
  sessionStorage.getItem('source_article')
  ```
  → doit retourner exactement `"calculateur-post-resultat"`
- [ ] Cliquer dans le champ **Prénom**
- [ ] Vérifier dans GA4 DebugView qu'un événement **`lead_form_started`** apparaît avec `source_article: "calculateur-post-resultat"` (délai 2-5s)
- [ ] Remplir tous les champs obligatoires :
  - Prénom : `Test`
  - Courriel : `test@example.com` (validation email HTML5 doit passer)
  - Téléphone : laisser vide (optionnel)
  - Région : `Montréal`
  - Nature : `Désaccord sur le montant de la pension`
  - Urgence : `Je dois agir dans le prochain mois`
  - Message : laisser vide
- [ ] **NE PAS cocher** les cases de consentement
- [ ] Cliquer **Envoyer ma demande**
- [ ] Vérifier que la validation HTML5 bloque et affiche un message natif du navigateur sur la case "J'accepte..." (bulle "Veuillez cocher cette case si vous souhaitez continuer" ou similaire)
- [ ] Cocher **uniquement la première case** (consent_partage)
- [ ] Cliquer **Envoyer ma demande**
- [ ] Observer :
  - Le bouton passe à "Envoi en cours..." (disabled)
  - Une requête POST vers `https://formspree.io/f/YOUR_FORM_ID` apparaît dans l'onglet Réseau → statut **404** (attendu)
  - Une **alerte JS** s'affiche : "Une erreur est survenue lors de l'envoi. Veuillez réessayer ou nous écrire à contact@pensionalimentaire.ca"
  - Le bouton redevient cliquable et affiche "Envoyer ma demande"
- [ ] **Confirmer** que `lead_form_submitted` **N'APPARAÎT PAS** dans GA4 DebugView (comportement actuel — voir la note en haut de ce fichier)

---

## SCÉNARIO 2 — Parcours depuis un article

- [ ] Ouvrir `http://127.0.0.1:8000/garde-partagee.html?debug_mode=1`
- [ ] Scroller jusqu'au CTA `.cta-article` (fond bleu clair, bordure gauche cyan) — il apparaît **après la section §5 (seuil 60/40)**, avant la section §6 (frais particuliers)
- [ ] Cliquer sur "Parlez à un avocat de votre situation"
- [ ] Vérifier l'arrivée sur `/consultation.html?debug_mode=1`
- [ ] Console → `sessionStorage.getItem('source_article')` doit retourner `"garde-partagee"`
- [ ] Vérifier aussi que le champ caché `source_article` du form est bien peuplé :
  ```js
  document.querySelector('[name="source_article"]').value
  ```
  → doit retourner `"garde-partagee"`
- [ ] Cliquer dans le champ Prénom → vérifier `lead_form_started` avec `source_article: "garde-partagee"` en DebugView
- [ ] Faire une soumission complète (même processus que scénario 1) → confirmer alerte d'erreur (Formspree 404)

### Répéter pour un article différent

Répète ce mini-test pour au moins **2 autres articles** parmi :
- `5-erreurs-pension-alimentaire.html` → source_article attendu : `"5-erreurs-pension-alimentaire"`
- `modele-quebecois-vs-federal.html` → `"modele-quebecois-vs-federal"`
- `sarpa-rajustement-pension.html` → `"sarpa-rajustement-pension"`
- `pension-alimentaire-impots.html` → `"pension-alimentaire-impots"`
- `union-de-fait-vs-mariage-quebec.html` → `"union-de-fait-vs-mariage-quebec"`
- `mediation-familiale-quebec.html` → `"mediation-familiale-quebec"`
- `frais-particuliers-article-9.html` → `"frais-particuliers-article-9"`

---

## SCÉNARIO 3 — Validation Loi 25

- [ ] Ouvrir `http://127.0.0.1:8000/consultation.html` (fresh, sans venir d'un CTA)
- [ ] Console → `sessionStorage.getItem('source_article')` → doit retourner `null`
- [ ] Vérifier que le champ caché `source_article` contient soit une chaîne vide, soit `"direct"`, soit le referrer (selon le code : `sessionStorage → referrer → 'direct'`)
- [ ] Inspecter les deux checkboxes de consentement :
  - `input[name="consent_partage"]` → **NE DOIT PAS** être `checked` par défaut
  - `input[name="consent_infolettre"]` → **NE DOIT PAS** être `checked` par défaut
- [ ] Remplir tous les champs obligatoires, laisser les 2 cases décochées, soumettre → HTML5 bloque sur `consent_partage`
- [ ] Cocher UNIQUEMENT `consent_partage`, laisser `consent_infolettre` décochée, soumettre → **doit passer la validation HTML5** (Formspree répond ensuite avec une erreur mais ce n'est pas l'objet du test ici)
- [ ] Cocher les 2 cases, soumettre → **doit aussi passer la validation HTML5**
- [ ] Cliquer sur le lien `confidentialite@pensionalimentaire.ca` dans le texte de consentement → doit ouvrir le client mail par défaut avec `mailto:confidentialite@pensionalimentaire.ca` en destination
- [ ] Cliquer sur le lien "politique de confidentialité" dans le `<p class="trust-note">` sous le bouton → arriver sur `/confidentialite.html`
- [ ] Vérifier que `/confidentialite.html` contient bien les nouvelles sections de la tâche 6 :
  - **§4 Formulaire de consultation avec un avocat en droit familial** (avec sous-sections 4.1 à 4.5)
  - **§5 Communication de vos renseignements à des tiers** (avec sous-sections 5.1 à 5.4, mention JuriGo + Neolegal + Formspree)
  - Numérotation continue **§1 à §12**
  - Date "Dernière mise à jour : 17 juillet 2026"

---

## SCÉNARIO 4 — Anti-spam et cas limites

### Honeypot `_gotcha`

**⚠️ Limite de Phase A** : Formspree est le composant qui rejette la soumission si `_gotcha` est rempli. Puisqu'on utilise `YOUR_FORM_ID` invalide, Formspree va rejeter la soumission de toute façon. **Le test réel du honeypot devra se faire en Phase B.**

En Phase A, on peut au moins vérifier que **le champ existe et est masqué** :

- [ ] Sur `/consultation.html`, inspecter :
  ```js
  const gotcha = document.querySelector('[name="_gotcha"]');
  console.log(gotcha.tagName, gotcha.type, gotcha.style.display, gotcha.tabIndex);
  ```
  → attendu : `INPUT text none -1`
- [ ] Vérifier que le champ **n'est PAS visible** à l'écran (aucun input textuel avant Prénom)
- [ ] Vérifier qu'en tabulant depuis "Décrivez votre situation", le focus **saute** le honeypot pour aller directement au champ Prénom (grâce à `tabindex="-1"`)

### Validation email

- [ ] Remplir Courriel avec `pasunemail` → soumettre → validation HTML5 bloque avec message natif "Veuillez inclure une adresse @..."
- [ ] Remplir Courriel avec `test@` → même comportement, HTML5 rejette
- [ ] Remplir Courriel avec `test@example.com` → HTML5 accepte

### Téléphone vide

- [ ] Laisser Téléphone vide, remplir tout le reste, soumettre → validation HTML5 doit passer (le champ n'est pas `required`)

### Message > 500 caractères

**⚠️ Précision** : le textarea a `maxlength="500"`, ce qui **empêche** de taper plus de 500 caractères — il n'y a pas de "troncation automatique" par du JavaScript, c'est le navigateur qui bloque à la source.

- [ ] Coller un texte de 600 caractères dans le message (utiliser une phrase répétée)
- [ ] Vérifier que **seuls les 500 premiers caractères** apparaissent dans le champ après le paste
- [ ] Tester `document.querySelector('[name="message"]').value.length` en console → doit retourner `500` ou moins

---

## SCÉNARIO 5 — Responsive

Utiliser DevTools → mode responsive (**Ctrl+Shift+M** dans Chrome/Edge/Firefox).

### iPhone SE (375×667)

- [ ] Ouvrir `/consultation.html` en 375×667
- [ ] Vérifier que **aucun débordement horizontal** — pas de scroll horizontal en bas de la fenêtre
- [ ] Les 2 checkboxes de consentement restent **cliquables** (zone tactile ≥ 44×44px sur la case elle-même ou le label associé)
- [ ] Les radios "niveau d'urgence" ne se chevauchent pas et chaque option reste lisible
- [ ] Les cartes "Comment ça fonctionne" (grid-3) se **réempilent verticalement** en une colonne
- [ ] Le bouton "Envoyer ma demande" occupe toute la largeur (`.btn-full`)
- [ ] Le hero avec les 3 badges (Gratuit / Confidentiel / Sans engagement) reste lisible

### Tablette (768×1024)

- [ ] Vérifier que le layout `grid-3` passe soit en 3 colonnes soit en 2 (selon le breakpoint)
- [ ] Formulaire toujours utilisable, largeur maxi confortable (pas étiré)

### Desktop (1024, 1440)

- [ ] À **1024×768** : formulaire centré, max-width 720px, marges respirantes
- [ ] À **1440×900** : idem, pas de largeur excessive du formulaire

### Test bonus — repli du header

- [ ] Sur les résolutions ≤ 640px, vérifier que la nav ("Calculateur / Consultation avocat / Méthodologie / À propos") reste utilisable (soit inline si ça rentre, soit dans un menu hamburger si tu en as un — sinon vérifier qu'elle ne casse pas le layout)

---

## SCÉNARIO 6 — Vérifications console / réseau / SEO

### Console — aucune erreur JS

- [ ] DevTools → Console → charger `/consultation.html` fresh
- [ ] Confirmer **zéro erreur rouge**. Les warnings (jaune) peuvent être tolérés mais note-les si tu en vois

### Réseau — aucune requête 404

- [ ] DevTools → onglet **Réseau** (clear tout, cocher "Preserve log")
- [ ] Charger `/consultation.html`
- [ ] Filtrer par **Status ≥ 400** → doit être vide
- [ ] Vérifier que ces ressources chargent bien (200) :
  - `/css/style.css`
  - `/js/tracking.js`
  - `/favicon.svg`
  - `https://www.googletagmanager.com/gtag/js?id=G-99YR4X2NJ7` (200 ou CORS OK)

### Schema.org JSON-LD

- [ ] Console → taper :
  ```js
  JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)
  ```
  → doit retourner un objet avec `@context: "https://schema.org"`, `@type: "WebPage"`, `name`, `description`, `url`, etc. sans erreur de parsing
- [ ] Copier le contenu du script JSON-LD, aller sur https://validator.schema.org/, coller dans "Fetch code snippet" → **zéro erreur ni warning**

### Open Graph

- [ ] Console → vérifier la présence des balises OG :
  ```js
  ['og:title','og:description','og:url','og:image','og:image:width','og:image:height'].forEach(p => {
    const el = document.querySelector(`meta[property="${p}"]`);
    console.log(p, el ? el.content : 'MISSING');
  });
  ```
  → aucune ligne ne doit afficher `MISSING`
- [ ] Optionnel : coller l'URL de production `https://pensionalimentaire.ca/consultation.html` sur https://www.opengraph.xyz/ (à faire une fois la Phase A validée et le site rafraîchi)

---

# PHASE B — Après configuration Formspree

À faire une fois que ton compte Formspree est créé et que tu as ton vrai form ID (format `https://formspree.io/f/xxxxxxxxxxxx`).

## B.1 — Préparation

- [ ] Récupérer ton form ID dans le dashboard Formspree
- [ ] Ouvrir `consultation.html`, ligne ~132, remplacer :
  ```html
  <form id="lead-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST" novalidate>
  ```
  par :
  ```html
  <form id="lead-form" action="https://formspree.io/f/xxxxxxxxxxxx" method="POST" novalidate>
  ```
- [ ] Commit + push
- [ ] Attendre le rebuild GitHub Pages (2-5 min)
- [ ] Vérifier que https://pensionalimentaire.ca/consultation.html contient bien le nouveau form ID (view-source ou DevTools)

## B.2 — Soumission réussie de bout en bout

- [ ] Depuis la **vraie URL prod** (pas local), utiliser un courriel jetable :
  - https://temp-mail.org/ (généré à la volée)
  - OU un alias `+test@` de ton domaine principal (ex. `simon+lead-test@ton-domaine.com`)
- [ ] Ouvrir `https://pensionalimentaire.ca/calculateur.html`, faire un calcul, cliquer sur le CTA post-résultat
- [ ] Remplir le formulaire avec des données réalistes + cocher `consent_partage`
- [ ] Cliquer **Envoyer ma demande**
- [ ] Vérifier que le fetch retourne **200** dans l'onglet Réseau
- [ ] Vérifier que la vue de succès (checkmark ✓ + "Votre demande a été envoyée") **remplace le formulaire**
- [ ] Vérifier dans GA4 DebugView que `lead_form_submitted` **fire cette fois-ci** avec :
  - `source_article: "calculateur-post-resultat"`
  - `region: "montreal"` (ou ce que tu as sélectionné)
  - `nature: "..."`
  - `urgence: "..."`
- [ ] Aller dans ta boîte mail de test → attendre 30-60s → réception du mail Formspree
- [ ] Vérifier que l'email contient **TOUS les champs** :
  - `prenom` ✓
  - `courriel` ✓
  - `telephone` (si rempli) ou vide ✓
  - `region` ✓
  - `nature` ✓
  - `urgence` ✓
  - `message` (si rempli) ✓
  - `source_article` ✓
  - `consent_partage: on` ✓
  - `consent_infolettre: on` (si coché) ou absent
  - `_gotcha` (si présent, doit être vide)

## B.3 — Test source_article depuis un article

- [ ] Vider sessionStorage : `sessionStorage.clear()` en console
- [ ] Ouvrir `https://pensionalimentaire.ca/mediation-familiale-quebec.html`
- [ ] Cliquer le CTA `cta-article` de l'article
- [ ] Sur `/consultation.html`, soumettre à nouveau (autre courriel de test)
- [ ] Vérifier le mail Formspree → `source_article: mediation-familiale-quebec`
- [ ] Vérifier GA4 DebugView → `lead_form_submitted` avec le bon `source_article`

## B.4 — Test honeypot anti-spam

- [ ] Sur `/consultation.html`, console →
  ```js
  document.querySelector('[name="_gotcha"]').value = 'im-a-bot'
  ```
- [ ] Remplir le formulaire normalement + cocher consentement + soumettre
- [ ] Vérifier que Formspree **retourne un succès factice** (ou un 200) mais que **AUCUN mail n'est envoyé** dans ta boîte
- [ ] Vérifier dans le dashboard Formspree que la soumission est marquée comme spam ou n'apparaît pas

## B.5 — Marquer `lead_form_submitted` comme événement clé dans GA4

- [ ] Attendre 24-48h après la première soumission réussie
- [ ] GA4 → Admin → Data display → Events → onglet "Événements récents"
- [ ] `lead_form_submitted` doit maintenant apparaître dans la liste
- [ ] Cliquer l'étoile ☆ pour le marquer comme événement clé
- [ ] Confirmer dans l'onglet "Événements clés" que `lead_form_submitted` s'ajoute à `calculator_submitted`, `calculator_cta_click`, `result_printed`

## B.6 — Vérification prod finale

- [ ] Depuis un **appareil mobile** (téléphone réel, 4G), refaire une soumission complète
- [ ] Vérifier réception mail + événement GA4
- [ ] Confirmer que le layout mobile reste utilisable en vraies conditions

---

# Correctifs à décider

## 1. Timing de `lead_form_submitted` — DÉCISION : Option A ✅

**Choix arrêté le 2026-07-17** : garder le code tel quel — `lead_form_submitted` fire uniquement si Formspree répond 2xx.

**Rationale** :
- Métrique propre : ne compte que les vraies conversions abouties
- Pas de bruit dans GA4 si Formspree flanche occasionnellement
- La validation complète se fait naturellement en Phase B avec un vrai form ID

**Impact assumé** : Phase A ne peut pas tester `lead_form_submitted` — la checklist scénario 1 documente explicitement l'absence de l'événement comme comportement attendu.

## 2. Nouveaux `lead_form_source_missing` ?

Actuellement, si un visiteur arrive directement sur `/consultation.html` (sans passer par un CTA ni un article), `source_article` est peuplé avec :
- `sessionStorage.getItem('source_article')` (null → skip)
- `document.referrer` (vide si taper URL directement → skip)
- fallback `'direct'`

Ça donne des valeurs GA4 propres. **Aucune action requise** — juste documenter dans le dashboard qu'une conversion avec `source_article = 'direct'` = arrivée organique sans CTA.

## 3. Filtre trafic interne dans GA4

À faire avant que le trafic ne monte pour ne pas polluer les stats avec tes propres tests. Voir la section correspondante dans [gaTestMode.md](./gaTestMode.md).
