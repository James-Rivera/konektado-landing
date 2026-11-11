# Konektado landing page

A standalone editorial website for Konektado. This project contains the public story, static prototype captures, team portraits and selected hackathon photographs, English/Taglish controls, and contact invitation. It is independent of the application and Research repositories.

## Run locally

Use Node.js 22 or newer. There are no runtime or development dependencies, so no package installation is required.

```sh
npm start
```

Open http://127.0.0.1:4174. The preview binds to loopback only. Set LANDING_PORT to use another port. Expo, the app API, AI providers, authentication and a database are not required.

## Check

```sh
npm run check
npm test
```

The tests cover the static page, selected asset routes, blocked source/app/API routes, allowed request methods, Host handling, translation coverage and project independence. Browser viewport checks are separate from physical-device testing.

## Files

- public/index.html — page structure and default Taglish text.
- public/site-config.js — optional approved APK/web handoff target.
- public/translations.js — authored English and Taglish copy.
- public/styles.css — layout, local Helvetica faces and bundled Inter fallback; no Arial font reference.
- public/find-work-motion.js — one-time dot sweep and photo reveal introducing Find Work; respects motion preferences.
- public/team-motion.js — one-time yellow-dot portrait reveal and brief hover, keyboard and tap effects; respects reduced-motion and the opening motion control.
- public/script.js — motion, language preference, static capture reader, image viewer and Copy email feedback.
- public/assets/ — selected presentation images, placeholders and retained license notices.
- server.cjs — loopback-only preview with an explicit asset list.
- vercel.json — static hosting configuration; only public/ is deployed.

Taglish uses conversational Filipino/English: original Filipino hooks, familiar English interface labels, and mixed explanatory copy. Language defaults to Taglish and remembers an explicit choice on the same origin. The browser title is Konektado. Prototype images retain their original text and fictional example details. Page copy explains that searching does not contact providers, requesting a quote is deliberate, and direct chat follows confirmed booking.

## App handoff

The opening and reading-header app buttons are prepared but hidden while public/site-config.js has app: null. The existing konektado.app deployment is a Research version, so it is not used as the default destination.

After the owner identifies the intended build, set app to either { kind: 'apk', href: '/downloads/konektado.apk', filename: 'Konektado.apk' } or { kind: 'web', href: 'https://the-approved-app-host/' }. Labels adapt to the selected language. For an APK, add the approved file and update the preview server asset list/MIME handling before enabling the target; external hosted APK URLs also work. The button uses normal browser navigation/download behavior and no app code is embedded. Invalid or absent destinations remain hidden. No deployment or DNS changes are part of this extraction.

## Publish later

Create a separate static hosting project from this directory. For Vercel, use Framework Preset Other, this directory as the project root, and public as the output directory; vercel.json already declares that output. No app build or environment variables are needed. Do not import the parent app's Vercel settings, credentials, environment files or backend links. The current live domain has not been reassigned.

The source public folder is also suitable for another static host. Preserve the security headers in vercel.json or apply equivalent headers at the chosen host.

## Photos

Team portraits use owner-supplied photos, converted to optimized WebP with lowercase, hyphenated full names. Find Work is introduced by its heading and capability-profile example. Original supplied files are unchanged. The hackathon gallery uses team-innobyte.webp, award-presentation.webp and third-runner-up.webp. All preserve their full landscape frame and open in the image viewer. A separate press section below the gallery displays qualifiers-press-report.webp and third-runner-up-press-report.webp from public/assets/press, with The Cloud Sentinel attribution and full-image viewing. Each caption includes a verified original Facebook-post link that opens in a new tab. Supported portrait basenames in public/assets/team are james-carlo-rivera, dale-andrew-lee, lance-montifar, mark-vincent-plaza and marcus-gabriel-marasigan. Supported event basenames in public/assets/hackathon are 01, 02 and 03. JPG, PNG and WebP are supported.

Update each image's src and accurate alt text in public/index.html, remove is-placeholder from its figure, and update captions. Portraits use a 3:4 frame; event images use mixed editorial ratios. If a caption is translated, update its copy key in both languages. Other filenames require an update to the preview server's asset list.

## Fonts and credits

Helvetica uses fonts already installed on a visitor's device. No Helvetica binary is bundled; Inter is the bundled fallback. Asset sources and notices are retained in public/assets/CREDITS.txt, Inter-OFL.txt and Maya-LICENSE.txt. Supplied event photos replace the original placeholders.
