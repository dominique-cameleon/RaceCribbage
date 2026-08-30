@echo off
REM Lance tools/course-prototype.html avec un serveur local.
REM Necessaire car les imports ES module sont bloques en file://.
REM Double-clic : demarre le serveur dans sa fenetre, attend qu'il reponde,
REM puis ouvre le navigateur. Fermer la fenetre du serveur = arreter le serveur.

REM Racine du repo, quel que soit le dossier de lancement (%~dp0 = ...\tools\).
cd /d "%~dp0.."

REM Serveur dans sa propre fenetre ; cmd /k garde les logs/erreurs visibles.
REM --bind 127.0.0.1 : force l'IPv4 (evite le cas "localhost -> ::1" -> ERR_CONNECTION_REFUSED).
REM Port 8000 deja pris : l'erreur s'affiche telle quelle dans cette fenetre.
start "RaceCribbage - serveur (fermer pour arreter)" cmd /k py -m http.server 8000 --bind 127.0.0.1

REM Attendre que le serveur reponde (max ~15 s) AVANT d'ouvrir le navigateur,
REM sinon le demarrage lent de Python donne un ERR_CONNECTION_REFUSED.
powershell -NoProfile -ExecutionPolicy Bypass -Command "for($i=0;$i -lt 30;$i++){ try{ $null = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8000/' -TimeoutSec 1; break } catch { Start-Sleep -Milliseconds 500 } }"

REM Ouvre le prototype dans le navigateur par defaut (127.0.0.1, pas localhost).
start "" "http://127.0.0.1:8000/tools/course-prototype.html"
