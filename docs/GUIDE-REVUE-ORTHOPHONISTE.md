# Brouillon 0.1 — Guide de revue pour l’orthophoniste

Ce brouillon montre **le fonctionnement** de l’application. Le **contenu**
(mots, emplacements, tableaux, plannings) est provisoire : il sert seulement à
faire tourner l’application et doit être remplacé par votre propre vocabulaire.

**Démo :** https://claude.ai/artifact/6KiN8TkiZfScTfEq8HAqzS
Idéalement sur iPad, en paysage. Code accompagnant : **1234**.

**Guide intégré :** l’application contient maintenant son propre guide (bouton *Guide* dans la
barre, et dans *Réglages*). Deux parcours : *Premiers pas* (familles, débutants) et
*Accompagnants & pros* (principes, personnalisation, TLA, plannings, modélisation, impression,
données). Chaque chapitre a un bouton *Essayer* qui ouvre l’endroit dont il parle. Une carte
*Bienvenue* le propose au premier lancement.

## À tester maintenant (15 minutes)

1. Ouvrir le lien : la carte *Bienvenue* s’affiche → *Ouvrir le guide* → lire *Premiers pas* et
   toucher *Essayer* sur 2 ou 3 chapitres.
2. Toucher *je* → *vouloir* → *manger* → *Parler* : on doit entendre « je veux manger » (pas « vouloir »).
3. *Langue* : deux choix séparés. *Langue de communication* → عربي (لبناني) : les mots sont aux mêmes places
   ; *Langue de navigation* → العربية : menus, boutons et guide en arabe, mots inchangés. Essayer
   aussi « navigation en français, mots en libanais ». Revenir au français. (Les textes arabes de
   navigation sont en arabe standard simple : à faire relire.)
4. *Chercher* → taper « pome » → *Montre-moi où* ; puis *Dessiner* un ballon → *Trouver*
   (accepter l’accès à l’IA la première fois).
5. *Aide* : un appui dit « Aide-moi ! » tout de suite, puis les choix.
6. Dossier *applis* → *YouTube* : dans la démo, un bandeau propose *Ouvrir YouTube* (les
   navigateurs interdisent l’ouverture automatique ; sur l’iPad, l’appli s’ouvre seule après un
   compte à rebours de 3 s). YouTube refuse de s’ouvrir depuis la page de démonstration
   (sécurité de YouTube face aux pages « bac à sable ») : c’est normal dans la démo, le bandeau
   donne le lien à copier ; dans l’application il s’ouvre directement. *WhatsApp* : message pour
   les parents. Puis *je* → *vouloir* → *musique* (dossier *activités*) → *Parler* → *Ouvrir Spotify*.
7. *Planning* : *Fait*, *D’abord / Ensuite* ; *Minuteur* d’1 minute.
8. *Accompagnant* (1234) → *Réglages* → *Faire vibrer les pictogrammes* → *Terminer* → toucher
   des mots puis *Parler* : chaque image bouge quand elle est dite.
9. *Accompagnant* → *TLA* → *Nouveau TLA* → « préparer un gâteau » → *Proposer des mots* :
   ingrédients, ustensiles et étapes ; créer avec le planning.
10. *Accompagnant* → toucher une case → *Internet* → *Coller l’image* (copiée sur un site) ;
    *Voix enregistrée* en libanais.
11. *Modèle* → écrire « je veux jouer au ballon » → *Montrer sur la grille* : la main ouvre le
    dossier *activités* puis touche *ballon*.
12. Noter tout ce qui ne convient pas : mots, places, couleurs, libellés libanais, ce qui manque.

## Détail des fonctions

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

**Nouveautés du brouillon 0.2**

7. **Mot prononcé accordé** : « je » puis « vouloir » fait dire « veux ».
8. **Aide** (rouge) : plus grand. « J’ai besoin d’une pause » est l’un des choix de l’Aide.
9. **Modèle** (main, dans la barre) : écrivez ou dictez « je veux jouer au ballon » → une main
   montre chaque mot sur la grille ; le bandeau du haut annonce chaque étape (« Ouvre le dossier
   « activités » », « Touche « ballon » »), puis la phrase est lue. Les **dossiers sont appuyés
   exactement comme les mots** (la main vise, appuie, le nom du dossier est dit, puis il s’ouvre).
   On peut aussi **enregistrer une démonstration** (touchez les mots) et la **rejouer**.
10. **Chercher** (loupe) : tapez le mot, ou touchez **Dire le mot** (micro), ou **Dessiner** :
    dessinez l’objet (ou écrivez le mot) avec le doigt puis *Trouver* — l’application propose
    « Je pense que c’est : ballon, soleil… » et montre où est le mot. (La reconnaissance des
    dessins passe par l’IA : dans la démo en ligne pour l’instant.)
11. **Applis** (nouveau dossier sur le tableau principal) : YouTube, WhatsApp, Spotify, Anghami.
    Toucher l’appli l’ouvre après un compte à rebours de 3 secondes (*Annuler* possible). Si
    l’enfant dit une phrase qui en parle (« je veux écouter de la musique » puis *Parler*), l’appli
    s’ouvre aussi. WhatsApp n’a pas de lien au départ : l’enfant voit un message pour les parents
    (ajouter https://wa.me/ suivi du numéro). Dans la démo, les applis s’ouvrent dans un onglet.
12. **Réglages** : *Faire vibrer les pictogrammes* (le pictogramme bouge quand on le touche et
    pendant qu’il est dit, mot par mot pour une phrase) ; *Ouvrir l’application citée dans une
    phrase* (activé par défaut).
13. **Mode accompagnant** :
    - *TLA* → *Nouveau TLA* → tapez un sujet (ex. « préparer un gâteau ») → *Proposer des mots* :
      l’application reconnaît la situation (≈ 45 situations : cuisine, routines, fêtes, sorties,
      santé, école, transports, jeux…) et propose **les mots de l’activité** (farine, œufs, sucre,
      fouet, moule, four, mélanger, verser…) et **les étapes dans l’ordre**. Pour un sujet inconnu,
      *Demander à l’IA* propose les mots et les étapes avec les libellés libanais (dans la démo en
      ligne ; sur l’iPad il faudra un petit serveur). Touchez un mot ou une étape pour le retirer,
      ajoutez-en, puis créez. Option : *Créer aussi le planning de ces étapes* (relié au TLA, avec
      minuteur, ex. four 30 min).
    - Image d’un mot : *Pictogrammes* (ARASAAC hors ligne), *Photo* (galerie ou appareil photo) ou
      *Internet* : pictogrammes d’autres banques gratuites (Tawasol en arabe, Mulberry, Sclera…),
      photos et dessins libres, *Coller l’image* copiée sur un site, ou le lien d’une image. L’auteur
      et la licence s’affichent sous l’image. (Dans la démo en ligne, la page n’a pas accès à
      Internet : utilisez *Coller l’image*.)
    - Sur une case : section *Application* pour transformer n’importe quel mot en lien vers une appli
      (YouTube Kids, Netflix…) et choisir les mots qui l’ouvrent dans une phrase.
    - Nouveau mot (case vide → *Créer un nouveau mot*) : le pictogramme ARASAAC est choisi
      automatiquement parmi toute la bibliothèque ARASAAC (≈ 13 900 pictogrammes, hors ligne ;
      les pluriels sont compris : « bulles de savon » trouve « bulle de savon »).
    - Sur une case : *Taille de la carte*, *Agrandir sur les cases vides voisines*, *Intensité de la
      couleur*, et *Déplacer cette case* (puis touchez la nouvelle place).

> Dans la démo en ligne, le micro et la fenêtre d’impression sont bloqués par le
> navigateur de démonstration (l’aperçu d’impression reste visible). Sur l’iPad,
> l’application utilisera le micro, AirPrint et l’export PDF hors ligne.

## Ce dont j’ai besoin de vous

1. **Le vocabulaire de base** : la liste des mots et **leur position** dans la
   grille (actuellement 7 lignes × 12 colonnes, à confirmer), avec le niveau de
   révélation de chaque mot (1, 2 ou 3).
2. **Le code couleur** : clé de Fitzgerald modifiée (actuelle) ou autre ?
3. **Les dossiers** (personnes, nourriture, émotions…) et leur contenu.
4. **Les situations proposées** à la création d’un TLA (fichier `src/data/situations.ts`) :
   les mots et les étapes de chaque situation sont à valider.
5. **Les TLA de départ** : lesquels, et leur contenu. Actuellement chaque TLA a
   un bloc fixe de mots de base dans les deux colonnes de gauche (je, vouloir,
   tu, aimer, encore, pas, fini, stop, aide-moi, quoi). Faut-il le garder ?
6. **Les libellés en libanais** : tous à vérifier par un locuteur natif
   (fichier `src/data/concepts.ts`, colonne arabe).
7. **La grammaire arabe** : règles d’accord (genre de l’utilisateur, de
   l’interlocuteur, personne du verbe). Rien n’est automatisé en arabe pour
   l’instant ; seules les formes féminines des adjectifs le sont.
8. **Les messages du bouton Aide** et des modes rapides.
9. **Ce qui vous gêne** dans l’ergonomie : taille des cases, place de la barre,
   bande de phrase, etc.

Le plus simple : un tableau Excel avec une ligne par mot (français, anglais,
libanais, catégorie, position, niveau). Je l’intégrerai directement.
