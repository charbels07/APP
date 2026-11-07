# Brouillon 0.1 — Guide de revue pour l’orthophoniste

Ce brouillon montre **le fonctionnement** de l’application. Le **contenu**
(mots, emplacements, tableaux, plannings) est provisoire : il sert seulement à
faire tourner l’application et doit être remplacé par votre propre vocabulaire.

**Démo :** https://claude.ai/artifact/6KiN8TkiZfScTfEq8HAqzS
Idéalement sur iPad, en paysage. Code accompagnant : **1234**.

## Ce qu’il faut essayer (10 minutes)

1. **Construire une phrase** : touchez *je* → *aimer* → *pas* → *jouer*. La bande
   affiche « je n’aime pas jouer » (conjugaison, élision et négation automatiques).
   Touchez **Parler**.
2. **Changer de langue** : bouton *Langue* → *عربي (لبناني)*. Les mots restent
   **exactement à la même place** (plan moteur stable). On peut mélanger les
   langues dans une même phrase.
3. **Chercher un mot** : *Chercher* → tapez « pome » (avec la faute) →
   *Montre-moi où* : l’application guide vers le dossier puis vers le mot,
   sans rien déplacer. Essayez aussi « comment dire qu’il y a trop de bruit ».
4. **Aide** : le premier appui dit immédiatement « Aide-moi ! », puis propose
   des choix (j’ai mal, j’ai peur…). Les informations personnelles ne
   s’affichent que sur demande.
5. **TLA, Planning, Minuteur** : toujours accessibles par la barre de gauche ;
   le minuteur continue pendant qu’on communique.
6. **Mode accompagnant** (cadenas, code 1234) :
   - *Réglages* → *Vocabulaire révélé* → *Niv. 1* : les mots masqués laissent
     leur case vide, rien ne bouge (progressive reveal).
   - *Réglages* → *Accords* → *Féminin* : « contente », « fatiguée », « تعبانة ».
   - Touchez une case pour la modifier : libellés FR/EN/AR, photo, pictogramme
     ARASAAC, enregistrement de la voix (pour le libanais, les prénoms…).
   - Ouvrez *mes mots* et touchez une case vide pour créer un mot personnel.
   - *Imprimer / PDF* : TLA, plannings, D’abord/Ensuite, A4/A3, noir et blanc.

> Dans la démo en ligne, le micro et la fenêtre d’impression sont bloqués par le
> navigateur de démonstration (l’aperçu d’impression reste visible). Sur l’iPad,
> l’application utilisera le micro, AirPrint et l’export PDF hors ligne.

## Ce dont j’ai besoin de vous

1. **Le vocabulaire de base** : la liste des mots et **leur position** dans la
   grille (actuellement 7 lignes × 12 colonnes, à confirmer), avec le niveau de
   révélation de chaque mot (1, 2 ou 3).
2. **Le code couleur** : clé de Fitzgerald modifiée (actuelle) ou autre ?
3. **Les dossiers** (personnes, nourriture, émotions…) et leur contenu.
4. **Les TLA de départ** : lesquels, et leur contenu. Actuellement chaque TLA a
   un bloc fixe de mots de base dans les deux colonnes de gauche (je, vouloir,
   tu, aimer, encore, pas, fini, stop, aide-moi, quoi). Faut-il le garder ?
5. **Les libellés en libanais** : tous à vérifier par un locuteur natif
   (fichier `src/data/concepts.ts`, colonne arabe).
6. **La grammaire arabe** : règles d’accord (genre de l’utilisateur, de
   l’interlocuteur, personne du verbe). Rien n’est automatisé en arabe pour
   l’instant ; seules les formes féminines des adjectifs le sont.
7. **Les messages du bouton Aide** et des modes rapides.
8. **Ce qui vous gêne** dans l’ergonomie : taille des cases, place de la barre,
   bande de phrase, etc.

Le plus simple : un tableau Excel avec une ligne par mot (français, anglais,
libanais, catégorie, position, niveau). Je l’intégrerai directement.
