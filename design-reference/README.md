# design-reference — how to read these files

Each `*.dc.html` file is ONE screen of the approved design (منصة عراب, warm beige / brown / gold).
They are plain HTML + CSS exported from a design tool:

- Ignore the tool wrappers: `<x-dc>`, `<helmet>`, `<script src="./support.js">`, and the final `<script type="text/x-dc">` block. They are not part of the site.
- The `<style>` inside `<helmet>` holds the shared classes (.card, .btn, .bg, .bb, .chip, .ic, .bar, .in, .nv ...). Read it first: it is the component spec.
- Everything else is markup with inline `style="..."` values: exact spacing, sizes, radii, colors. Copy the VALUES, not the inline styles: convert them into the project's own CSS/classes/components.
- All text in square brackets, like «[اسم الكورس]» or «[السعر]», is a PLACEHOLDER for real data. Do not paste placeholders into the site; keep the site's real content.
- Icons are inline SVG (24x24, stroke 1.7, round caps). Reuse the project's icon approach, but match size/stroke/color.

| File | Screen | Board size |
|---|---|---|
| 01-splash-loading | Loading / preloader | 1360x760 |
| 02-auth-login-register | Login + register switch | 1360x880 |
| 03-landing-home | Landing page (header, hero, features, courses, footer) | 1360x3150 |
| 04-student-dashboard | Student dashboard | 1360x1020 |
| 05-courses-catalog | In-app courses catalog | 1360x1180 |
| 06-course-details | Course details | 1360x1250 |
| 07-lesson | Lesson page | 1360x1100 |
| 08-quiz | Quiz | 1360x900 |
| 09-profile-settings | Profile / settings | 1360x1000 |
