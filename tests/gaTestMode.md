# GA4 Debug Mode — comment voir les événements en temps réel

Ce guide t'explique 3 façons de voir tes événements GA4 pendant que tu remplis le formulaire de `/consultation.html`, pour valider que `lead_form_started` et `lead_form_submitted` fire correctement.

## Prérequis absolu — désactiver le bloqueur de pubs

Ta session Chrome habituelle bloque probablement GA4 (uBlock, Privacy Badger, Brave Shield, etc.). Aucun événement ne sera envoyé.

**Solutions** (choisis-en une) :
- Utiliser un **profil Chrome vierge** (menu profil → Ajouter → skip sign-in)
- Utiliser **Edge** en fenêtre InPrivate
- Utiliser **Firefox** avec extensions désactivées
- Utiliser un **navigateur mobile en 4G/5G** (pas Wi-Fi si le routeur bloque)

Vérifie que GA4 passe en ouvrant DevTools → onglet **Réseau** → filtre `collect` : tu dois voir des requêtes vers `google-analytics.com/g/collect` apparaître en chargeant une page.

---

## Option 1 — Query param `?debug_mode=1` (recommandé, sans extension)

**Le plus simple.** Ajoute `?debug_mode=1` à n'importe quelle URL du site.

Exemple :
```
http://127.0.0.1:8000/consultation.html?debug_mode=1
```

Ensuite ouvre GA4 dans un autre onglet :
- **Admin (⚙️)** → **Property → DebugView** (section "Data display" en français : **Affichage des données → DebugView**)
- Tu vas voir tes événements **en temps réel** (délai ~2-5 secondes) au fur et à mesure que tu interagis avec le formulaire

**Avantage** : tu vois les événements + tous leurs paramètres (`source_article`, `region`, `nature`, `urgence`) sans installer quoi que ce soit.

---

## Option 2 — Extension Chrome "Google Analytics Debugger"

**Utile pour voir les événements directement dans la console DevTools sans quitter la page.**

1. Installe l'extension : recherche **"Google Analytics Debugger"** dans le Chrome Web Store (l'officielle, développée par Google)
2. Active-la en cliquant son icône dans la barre d'outils (elle devient bleue quand ON)
3. Recharge la page `/consultation.html`
4. Ouvre DevTools (**F12**) → onglet **Console**
5. Chaque événement GA4 sera loggué avec un préfixe `[GA4]` ou `[gtag]` et tous ses paramètres

Exemple de ce que tu devrais voir en console quand tu cliques dans le champ Prénom :

```
[gtag] event: lead_form_started {
  source_article: "calculateur-post-resultat",
  ...
}
```

Et à la soumission (si le fetch Formspree réussit) :

```
[gtag] event: lead_form_submitted {
  source_article: "garde-partagee",
  region: "montreal",
  nature: "desaccord-montant",
  urgence: "2-semaines",
  ...
}
```

---

## Option 3 — Rapport Realtime dans GA4 (fallback)

Si les options 1 et 2 ne fonctionnent pas, tu peux valider via le rapport **Temps réel** de GA4 :

- Menu de gauche → **Rapports → Temps réel** (ou **Realtime**)
- Fais les actions sur ton site
- Attends 10-30 secondes → l'événement apparaît dans la carte "Nombre d'événements par nom d'événement"

**Limite** : Realtime ne montre pas les paramètres custom (`source_article`, etc.) en détail. Utilise Debug View (Option 1) pour valider les paramètres.

---

## Récap — quel outil pour quel test

| Test à faire | Meilleur outil |
|---|---|
| Voir que `lead_form_started` fire | DebugView (Option 1) ou console (Option 2) |
| Voir que `lead_form_submitted` fire | DebugView (Option 1) — mais voir la note en bas de `e2e-checklist.md` |
| Vérifier les paramètres (`source_article`, `region`, `nature`, `urgence`) | DebugView (Option 1) |
| Vérifier volumétrie / tendances | Realtime (Option 3) — mais ce n'est PAS un outil de debug fin |

---

## Filtre IP pour ne pas polluer tes stats

Une fois tes tests terminés, pense à **filtrer ton IP** dans GA4 pour que tes soumissions test ne comptent pas comme des conversions réelles :

- **Admin → Data streams → sélectionne le flux Web → Configure tag settings → Define internal traffic**
- Ajoute une règle : `traffic_type = internal` pour ton IP publique (visible sur https://ifconfig.me)
- Ensuite **Admin → Data filters → New filter → Internal traffic → Active**

Les événements sont toujours captés mais ne polluent plus les rapports.
