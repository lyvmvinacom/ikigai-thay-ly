IKIGAI WORLD – JFT-BASIC A2 MODULE v1.0

FILES TO UPDATE IN YOUR GITHUB REPOSITORY (root):
- index.html
- app.js
- style.css
- assets/jft/jft-basic-a2-tests.pdf
- assets/jft/answer-key.json

KEEP your existing assets/characters folder and other existing assets.

HOW TO INSTALL:
1. Back up/download your current GitHub repository first.
2. Upload/replace index.html, app.js, style.css at the repository root.
3. Create folder assets/jft (GitHub creates it when uploading files) and upload BOTH files inside it.
4. Commit changes to branch main.
5. Open the GitHub Pages URL and press Ctrl+F5 to reload.
6. A new button “🎓 Thi JFT A2” appears in the left menu.

FEATURES IN THIS BUILD:
- 10 test selection cards, 50 questions per test, 60-minute timer.
- PDF pages with illustrations are rendered in the exam screen using PDF.js.
- Students select A/B/C in a separate answer grid.
- Auto-submit when time expires; score and answer key shown after submission.
- Results history saved in the current browser/device (localStorage).

IMPORTANT LIMITATIONS:
- This is the first functional JFT module. Results are currently saved on the device/browser, not yet synchronized to the teacher dashboard/Supabase.
- PDF.js is loaded from a CDN, so the exam PDF viewer requires internet access.
- The source PDF's listening section is a written dialogue script, not audio playback.
- This module does not alter the existing N5 LMS database schema.


IKIGAI WORLD v3.2 UPDATE:
- Sidebar button 'Kiểm tra' has been replaced by the single 'Thi JFT A2' button.
- Practice bank order: Kanji tests 1-10, then Minna vocabulary lessons 1-25, then grammar lessons 1-25. Kanji summary, if present, appears after the 10 tests.
- Removed the specified IKIGAI source-note sentence from learner-facing question explanations.
- JFT module runs inside the app scope so it can use the existing panel and notification functions.
