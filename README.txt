Revision 7 corrective patch

Replace these files in the root of your existing Yanga Portfolio Preview folder:
- index.html
- additional-work.html
- motion-animation.html
- styles.css
- app.js
- _headers

Do not delete or replace your assets folder. In particular keep assets/web-videos, assets/fonts, images and posters.

Key fixes:
- Additional Work logo/wordmark tiles stay square but use contain, so wide marks are never cropped.
- Home reel uses one native autoplay video instead of three JS-controlled layered videos.
- Motion overlay uses native video src/autoplay/controls with a direct-file fallback.
