@echo off
REM Lance tools/course-prototype.html avec un serveur local.
REM Necessaire car les imports ES module sont bloques en file://.
REM Double-clic : demarre le serveur dans sa fenetre + ouvre le navigateur.
REM Fermer la fenetre du serveur = arreter le serveur (pas de process fantome).

REM Racine du repo, quel que soit le dossier de lancement (%~dp0 = ...\tools\).
cd /d "%~dp0.."

REM Serveur dans sa propre fenetre ; cmd /k garde les logs/erreurs visibles.
REM Port 8000 deja pris : l'erreur s'affiche telle quelle dans cette fenetre.
start "RaceCribbage - serveur (fermer pour arreter)" cmd /k py -m http.server 8000

REM Laisse le serveur demarrer (chemin complet : robuste si le PATH est pollue).
"%SystemRoot%\System32\timeout.exe" /t 1 /nobreak >nul

REM Ouvre le prototype dans le navigateur par defaut.
start "" "http://localhost:8000/tools/course-prototype.html"
