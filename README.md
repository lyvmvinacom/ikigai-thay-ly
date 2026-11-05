# IKIGAI WORLD – N5 Learning System v3.0

This update adds the first LMS layer while preserving the current Anime classroom, teacher avatar, chat, character movement and Supabase Realtime.

## Included
- Question bank for Minna no Nihongo lessons 1–25 and N5 Kanji (import the accompanying Excel seed workbook).
- Excel `.xlsx`, `.xls`, and `.csv` import. Rows with an existing `ma_cau_hoi` update that question; new codes add new questions.
- Teacher can add/edit/hide questions directly in the game.
- Teacher can assign a lesson/category to all students or selected students.
- Students can browse the N5 question bank and view assigned tasks.
- Quiz attempts are stored in Supabase; a local copy is also kept in browser localStorage.
- Teacher report and a leaderboard aggregated from server-stored attempts.

## Deployment
Replace these files at the root of the existing GitHub repository:
- `index.html`
- `app.js`
- `style.css`
Keep `assets/characters/` unchanged. Keep the existing Supabase URL and publishable key in `app.js`.

## One-time Supabase setup
1. Open Supabase Dashboard → SQL Editor.
2. Open `ikigai-lms-v3.sql`, copy all SQL, paste it into SQL Editor and Run.
3. Create/sign in the teacher account using the existing teacher login UI. In Supabase Authentication → Users, open that teacher user and set **app_metadata** to `{"role":"teacher"}`. This must be app_metadata, not user_metadata. Never put the Supabase service_role/secret key in the website.
4. Commit and deploy the three website files. Hard refresh the website (Ctrl+F5).

## Load the initial questions
1. Open `IKIGAI_N5_Question_Bank_Template_and_Seed.xlsx`.
2. It contains 70 starter questions: 50 representative questions distributed across Minna lessons 1–25 and 20 N5 Kanji questions.
3. In the game, sign in as teacher → Giáo viên → Ngân hàng & Giao bài → Nhập câu hỏi Excel.
4. Select the Excel file. The importer validates rows and upserts by `ma_cau_hoi`.
5. You can add/edit questions later in the same teacher panel.

## Excel columns
`ma_cau_hoi`, `nhom`, `bai`, `cau_hoi`, `dap_an_A`, `dap_an_B`, `dap_an_C`, `dap_an_D`, `dap_an_dung`, `giai_thich`.

Allowed `nhom`: `vocabulary`, `grammar`, `kanji`, `reading`, `listening`, `kaiwa`.
`bai`: 1–25 for Minna lesson, 0 for Kanji or mixed content.
Correct answer: A, B, C, or D.

## Important scope notes
- The workbook is an initial teaching bank, not an official exhaustive JLPT question bank. The 25 Minna lesson questions are representative starter items and should be reviewed by the IKIGAI teaching team before formal assessment.
- The first release supports 4-choice questions. Audio listening, reading passages with shared source text, fill-in answers, drag-to-order, and more advanced assignment analytics are future enhancements.
- Attempts are calculated by a Supabase RPC function using the stored answer key. Students cannot directly insert/update attempt scores through the browser API.
- The browser keeps a local attempt copy for convenience; Supabase is the shared source of truth across devices.
