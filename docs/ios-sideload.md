# Installing on an iPhone from Windows (free Apple ID)

GitHub's macOS machines build the IPA, and iloader signs it with your Apple ID and installs it over USB. No Mac and no paid developer account needed.

## Once

1. Install **iTunes** (or Apple Devices) from the Microsoft Store. iloader needs it to see the iPhone.
2. On the iPhone: **Settings › Privacy & Security › Developer Mode** → on, then restart. (The option shows up after you plug the phone into a computer once.)
3. Put the project on GitHub (private is fine):

   ```bash
   git init
   git add .
   git commit -m "Repforge"
   gh auth login
   gh repo create repforge --private --source . --push
   ```

## Every build

4. Start the build: GitHub › your repo › **Actions** › **iOS IPA for sideloading** › **Run workflow**, or:

   ```bash
   gh workflow run ios-ipa.yml
   ```

5. Wait for it (about 20–30 min): `gh run watch`.
6. Download the IPA: `gh run download --name Repforge-ipa`. This gives you `Repforge.ipa`.
7. Plug in the iPhone, unlock it and tap **Trust**.
8. In iloader: sign in with your Apple ID, choose to install an IPA, pick `Repforge.ipa`.
9. On the iPhone: **Settings › General › VPN & Device Management** › your Apple ID › **Trust** (first install only).

## Limits of a free Apple ID

- The app stops opening after 7 days. Run iloader again to re-sign it (no rebuild needed while the IPA still works for you).
- At most 3 sideloaded apps at a time, and a limited number of new App IDs per week. Repforge uses two (the app and its widget extension).
- Whether widgets, the Live Activity (they need an App Group) and Apple Health (HealthKit) work after free signing is not confirmed. The build log's "Ad-hoc sign" step prints the entitlements the IPA asks for. If iOS refuses them, the rest of the app still works.

## Exercise images

`assets/exercise-media/` and `src/features/exercises/media.generated.ts` are gitignored, because the GIF source isn't openly licensed. The cloud build doesn't have them, so the exercises show a placeholder icon. To get images in your own build, commit those two paths in a **private** repo only:

```bash
git add -f assets/exercise-media src/features/exercises/media.generated.ts
git commit -m "Exercise media for private builds"
git push
```
