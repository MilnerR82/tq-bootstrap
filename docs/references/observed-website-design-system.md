# Observed TAFE Queensland website design system

Research date: 1 October 2026. Source: rendered pages, DOM, computed styles and browser-accessible stylesheet rules. This is a representative public-site study, not an official brand specification or complete accessibility audit. Desktop sizes varied during inspection; a 390 x 844 viewport was also used. Values are CSS pixels unless noted.

## Live refresh: 15 October 2026

The following observations refresh the sampled hero states only. The original research below remains a historical 1 October snapshot, including its carousel details; it should not be read as a claim that every component is still present in the current page state.

- [Homepage](https://tafeqld.edu.au/): a dark navy-to-blue split search hero with the white heading “Make your great happen” (`helveticaneue-medium`, 45px / 50px). A rectangular workshop photograph sits on the right and extends into the next white section. A white search row overlaps the text and photograph areas. No hero carousel was observed in this sampled current state.
- [Health and science](https://tafeqld.edu.au/courses/study-areas/health-and-science): a warm-grey band, rectangular clinical-training photograph on the right and overlapping white rectangular introduction panel on the left. The H1 uses `helveticaneue-medium`, 28px, charcoal `rgb(55, 50, 52)` (`#373234`). The Read more primary anchor has a computed red fill of `rgb(227, 27, 35)` (`#E31B23`) and 25px border radius. The white label treatment is consistent with the prior visual snapshot; the anchor's computed text colour alone does not establish the child label's colour.

Homepage hero imagery, colours and layout can vary by campaign. Recheck the relevant live state before claiming current fidelity, and keep campaign treatments separate from recurring site conventions.

## Sources and scope

- [Homepage](https://tafeqld.edu.au/): global header/footer, hero, audience links, testimonials, news cards, icons and carousel styles.
- [Health and science](https://tafeqld.edu.au/courses/study-areas/health-and-science): overlapping image/text introduction, study-area filters and cards.
- [Current students](https://tafeqld.edu.au/current-students): alerts, service panels and neutral section backgrounds.
- [Application FAQs](https://tafeqld.edu.au/courses/apply-and-enrol/how-to-apply/application-faqs): interactive accordions, desktop/mobile measurements and keyboard expansion.
- [International FAQs](https://tafeqld.edu.au/international/faqs): static heading-and-paragraph FAQ treatment.
- [Enquire](https://tafeqld.edu.au/contact/enquire): Marketo fields, conditional controls and collection-notice disclosure.
- [Search results](https://tafeqld.edu.au/search-results): category tabs, filters, checkboxes, course cards and Load more.
- [Diploma of Nursing](https://tafeqld.edu.au/course/17/17738/diploma-of-nursing): course information, unit accordions, intake table, help icons, study choices and chat overlay. Course content and fees were not reviewed for substantive accuracy.

## Palette and visual hierarchy

| Token / role | Observed value | Usage |
| --- | --- | --- |
| Action red | #E31B23 | Primary buttons, active indicators and accents |
| Action hover | #C02127 | Primary-button hover rule |
| Gradient end pink | #F32A7C | Gradient border/underline accents |
| Charcoal | #373234 | Text, headings, dark controls |
| White | #FFFFFF | Cards, inputs, reading surfaces, reversed text |
| Light warm grey | #F1EFED | Sections, secondary buttons, carousel controls |
| Warm divider | #E1DDD8 | Fine rules and supporting surfaces |
| Input border grey | #A09D9E | Enquiry form borders |
| Link teal | #067A8E | Underlined content links |
| Accent teal | #02A3B1 | Event labels and plus-icon hover |
| Deep purple | #6C0162 | News labels |
| Pale teal | #EEF6F7 | Informational alert background |
| Button focus grey | #5B5B5B | 2px custom-button focus outline |

Red is concentrated on actions and selected states. Neutral surfaces carry most reading content. Strong purple/blue/other colours in campaign imagery are not universal interface tokens. Use computed CSS for exact colours rather than sampling screenshots, which may be affected by rendering or display tint.

Gradient rules use CSS variables `--color-start` and `--color-end` with red/pink defaults; individual components may override them. Typical accents are 4px high or wide. Horizontal underline/top-edge accents scale from near-zero width to full width on hover; accordion borders run vertically.

## Typography and layout

Custom font-face names: `helveticaneue-roman`, `helveticaneue-medium`, `helveticaneue-bold`. A computed weight of 400 does not mean the appearance is Roman: medium/bold are selected through separate face names.

| Role | Measured example |
| --- | --- |
| Homepage hero H1 | Medium, 45px / 50px |
| Main section H2 | Medium, 35px / 45px |
| Smaller section heading | Medium, commonly 28px / 35px; some use 28px line height |
| Health/science intro H1 | Medium, 28px / 28px |
| Study-area card title | Medium, 22px / 28px |
| Body | Roman, commonly 15px / 24px; some news copy 16px / 26px |
| Main navigation | Medium, 16px |
| Utility navigation | Roman, 13px |
| Card/category link | Medium, example 18px / 22px |
| Button text | Bold, commonly 15px |

Typography is component-specific, not determined solely by heading level. Titles mostly use sentence case; uppercase appears in compact metadata/labels. Large photographs, centred constrained content and generous spacing dominate. Some desktop containers have a 1340px maximum. Inner-page heroes overlap a light rectangular text panel with photography. Card/image corners are generally square; action buttons are rounded. Study-area cards use roughly 22px horizontal interior padding. Shared section spacing rules include 22, 45 and 90px variants at different breakpoints; do not apply one globally without context.

## Icon systems

Functional icons use custom `tq-icon-font` glyphs through `::before`; these are not a generic Font Awesome set. Stroke thickness is part of the font glyph, not an SVG stroke-width parameter.

Families observed in CSS: chevrons and arrows; magnifier; hamburger/menu-open; cross; plus; clock/calendar; play-circle; tick/tick-circle; download/upload; quote-mark; information/question circles; alert bell/stop; podcast/microphone; circular Facebook, Instagram, Twitter, YouTube and LinkedIn glyphs. This is a catalogue of defined styles, not proof every glyph is currently visible.

Measured examples: desktop nav chevrons 12px; dropdown chevron 18px; search 26-27px; hamburger rule 34px; social icons 28px; accordion plus 20px and cross 16px. Size and colour vary by component. Dark-background icons become white; interaction states can use red or teal.

Contact illustrations are separate SVGs, including:
- `/content/dam/tafe/en/site-media/icons/gradient/contact-webchat-icon-gradient.svg`
- `/content/dam/tafe/en/site-media/icons/gradient/contact-email-icon-gradient.svg`
- `/content/dam/tafe/en/site-media/icons/gradient/contact-call-icon-gradient.svg`

Do not assume all graphics share one icon implementation. Logos, contact illustrations, font glyphs and embedded-widget controls are separate assets/systems.

## Buttons, links, cards and states

- Primary: #E31B23 fill, bold white label, 25px radius; hover #C02127.
- Secondary: #F1EFED fill, charcoal label; hover charcoal with white label.
- Tertiary/outlined: white fill, 2px red border; hover red with white label.
- Quaternary stylesheet variant: #E1DDD8 fill, black label; hover charcoal/white.
- Typical custom-button padding: 8px vertically and about 51-52px horizontally, with component overrides. Enquiry submit uses 8px 30px.
- Content links: typically underlined teal; red hover with 0.1s colour transition. Navigation and card links have their own rules.
- Custom-button focus rule: solid 2px #5B5B5B outline.
- Cards use hover shadows and a 4px red/pink gradient top accent in several variants. Do not describe the system as having no significant shadows.
- Shared shadow: `0 1px 2px 0 rgba(0,0,0,.12), 0 2px 14px 1px rgba(0,0,0,.14)`.
- Stronger accordion hover shadow: `0 1px 18px 0 rgba(0,0,0,.12), 0 6px 10px 0 rgba(0,0,0,.14), 0 3px 5px -1px rgba(0,0,0,.2)`.

## Accordions

Application FAQs use `cmp-accordion` with button/header/panel elements and expanded/hidden modifier classes.

- Rectangular panel, 4px left red-to-pink gradient border, 15px bottom margin, resting shadow and stronger hover shadow.
- Desktop header minimum 65px, padding 8px 24px; title Medium 18px / 22px.
- At max-width 760px: header minimum 50px, title 16px / 18px. Long titles can make the row taller.
- Closed icon is charcoal plus (20px); hover plus becomes #02A3B1.
- Open icon is red cross (16px), not minus.
- Content wrapper: 36px padding, 1px #E1DDD8 top divider.
- Multiple FAQ panels remained open together. Enter closed a focused open panel; state was confirmed after the update completed.
- Buttons expose `aria-expanded` and `aria-controls`; panels use `role=region`, `aria-labelledby` and `aria-hidden`.
- Course units reuse the convention with core units initially open and electives closed.
- International FAQs were static text, not accordions.

CSS sets accordion button `outline:none`; visible keyboard focus warrants further review. For new implementations provide an explicit focus-visible treatment rather than copying that gap.

## Sliders and media

Owl Carousel appears in hero, audience-image, testimonial and news/events components. Hero has one active slide, automatic rotation and cloned slides for looping. Other configurations differ; the desktop news/audience samples had multiple active cards. `owl-drag` is present, but swipe/drag behaviour was not exhaustively tested.

- Hero arrows: 30px circular white controls.
- Other carousel arrow rules: 45px controls with warm-grey background; not visible in every configuration. Testimonial arrow container was hidden in the inspected desktop state.
- Testimonial active dot span: red, about 36 x 5px; inactive charcoal 5 x 5px.
- News active dot span: red, about 27 x 4px; inactive charcoal 4 x 4px.
- Differentiate tiny visible indicators from the surrounding button hit area.
- Mobile hero next control successfully changed the active slide. Testimonial dot movement was not conclusively verified; do not claim it was.
- Wistia video embeds and thumbnails appear in testimonials; video content was not analysed.

Some dot buttons lack descriptive names; some arrow buttons use presentation roles while their child spans carry labels. Review actual accessibility, not only presence/absence of button-level aria-label. For new carousels use explicit labels, keyboard support and appropriate autoplay/pause/reduced-motion behaviour; these are recommendations, not verified universal source behaviour.

## Navigation, search and course information

Desktop: utility navigation above primary navigation; expandable mega-menu with grouped links and a promotional image/content panel. Applicable hover underlines use the gradient accent. Inner-page breadcrumbs aid orientation.

Mobile: logo, search and hamburger; vertical main sections; second level with Back; nested subsection headings with plus indicators. Main and second-level menus were opened during inspection. The hamburger wrapper is a clickable div in the sample; use native button semantics in new work.

Search results: category tabs and counts; filter groups for region, mode, qualification, workload, study area and funding; checkbox options, Reset, result count and Load more. Study mode expansion was tested. Exhaustive filtering, loading/error states and pagination behaviour were not tested.

Course page: section navigation, summary metadata, inline question/help icons, download/print action, unit accordions, study-mode choices, location dropdown, checkboxes, intake table and per-intake actions. A class family for a course sticky menu exists; do not claim sticky behaviour was exhaustively exercised. Study-area filters elsewhere use a selected red underline.

## Forms, notices and overlays

Marketo Forms 2 enquiry form with site overrides:
- Square white inputs/selects: about 42px high, 1px #A09D9E border, Medium 16px text; sample padding 10px 1px 6px 9px.
- Textarea: about 160px high.
- Submit: red pill, 40px high, 25px radius, Bold 15px label.
- Hover/focus/active field rules add the shared shadow while retaining grey border.
- Conditional fields: selecting Courses revealed a study-preference dropdown.
- Privacy notice has Show more disclosure; reCAPTCHA is present.
- No live form was submitted and error/validation states were not fully exercised.

Course Ask a question opened a webchat name-entry overlay with dim backdrop, light rectangular panel, close control and disabled Start web chat button until a name is supplied. No chat was started. Amazon Connect integration was present. Modal focus trapping, Escape handling and every tooltip were not tested.

## Responsive rules and framework evidence

Repeated primary boundary: max-width 760px / min-width 761px. Additional rules around 1024, 1141 and 1341px, plus component/library-specific widths including 768px. Treat these as a mixed component system, not a single universal breakpoint scale. Mobile accordion changes were measured at 390px; homepage and course/chat layouts were visually inspected at that width. Narrower widths and all intermediate sizes remain unverified.

Framework evidence: `aem-Grid`, `responsivegrid`, `/etc.clientlibs/`, `/content/dam/`, Adobe component data and `tafe/components/...` types; custom `cmp-custom-*` components alongside `cmp-accordion`; Adobe Granite jQuery script; Owl Carousel DOM/CSS; Marketo `forms2.min.js` and `mktoForm`; Wistia scripts; Amazon Connect chat asset. This identifies technologies in the sampled public delivery, not exact installed versions, every dependency or private build tooling. Do not infer React, Bootstrap or Tailwind from generic layout similarities.

## Known review limits

No comprehensive accessibility, performance, browser-compatibility or whole-site audit was conducted. Not all modal, tooltip, validation, loading, disabled or error states were tested. Some carousel accessible names, mobile button semantics, accordion focus treatment and generic image alt text such as `demo` merit improvement. Recheck the live site when exact current fidelity matters; campaigns and implementation details can change.

## Expanded Harmony colour comparison: 16 October 2026

Compared live rendered/computed colours with the 37 unique colours in the user's supplied Harmony 1–4 framework. This comparison does not authenticate an official brand manual. The five-page baseline (homepage, Health and science, Current students, Application FAQs, Diploma of Nursing) was expanded with 20 additional desktop page inspections: News, Events, Contact, Business and IT, Creative industries, Education and community, Infrastructure and transport, Scholarships, Subsidised training, TAFE at School, Campus locations, Trade training, International, Employers, About, Centres of Excellence, the Alexandra career-reboot news article, Cairns health-career information-session event, Online learning, and Master of Cyber Security.

Nine exact colours were confirmed across this combined sample:

| Framework colour | Hex | Observed use |
| --- | --- | --- |
| TQ Red | #E31B23 | Actions, selected indicators and gradient accents |
| Eucalyptus Blossom | #F32A7C | Gradient accents and homepage statistics |
| Magpie Black | #373234 | Text, headings and dark elements |
| Magpie Black L1 | #696567 | Course section navigation and supporting icons |
| Koala Grey L2 | #F1EFED | Light section backgrounds and secondary buttons |
| Koala Grey L1 | #E1DDD8 | Borders and dividers |
| Koala Grey | #D7D2CB | Inactive regions of the embedded campus-location map |
| Jacaranda Purple D2 | #6C0162 | News labels |
| Sunkissed | #FF4904 | Expanded-navigation item hover accent, orange-to-pink gradient |

New finding: [Campus locations](https://tafeqld.edu.au/about/campus-locations) includes an embedded SVG under `.cmp-locations__location-map > .svg-content`. Its inactive region paths/polygons use `#D7D2CB`; the selected-region gradient has `#F32A7C` and `#E31B23` stops. The map was visually inspected and its computed SVG fill/stop colours checked. Treat this as a map component use, not proof that Koala Grey is a general page background.

The Sunkissed navigation accent was verified with its pseudo-element opacity changing from 0 to 1 on hover. Exclude hidden/transparent or near-zero-scale pseudo-elements when claiming visible use. Colours may appear in SVG fills and gradient stops as well as ordinary CSS text/background/border declarations.

The live shared stylesheet contains 18 of the 37 framework colours, but ten of those were not confirmed visibly used in the sampled pages/states: `#8A0008` (red-alert text rule), and gradient-option values `#9A2191`, `#BF0347`, `#FC9B41`, `#EF7622`, `#00A89B`, `#00766C`, `#2F4370`, `#23325C`, `#091135`. A defined rule or variable is not evidence of rendered use. The new map grey is supplied separately in the page's embedded SVG styles. No exact Harmony 4 colour was confirmed in the sampled rendered states; this is not a site-wide absence claim.

Sources include [Campus locations](https://tafeqld.edu.au/about/campus-locations), [Online learning](https://tafeqld.edu.au/courses/ways-to-study/online-learning), [Master of Cyber Security](https://tafeqld.edu.au/course/19/19383/master-of-cyber-security), and the [shared stylesheet inspected on this date](https://tafeqld.edu.au/etc.clientlibs/tafe/clientlibs/clientlib-site.lc-03cfe436d33ae43177ef51fe38c8ce94-lc.min.css). Supplementary public HTML source screening covered additional actual linked pages; it does not replace browser verification. Photography, PDFs, every responsive layout and every interaction state were outside this colour comparison.

## Further 25-page review: Harmony 4 confirmed, 16 October 2026

The previous paragraph's lack of observed Harmony 4 use applies only to the first 25-page sample. A further 25 distinct pages were inspected in the browser, with canonical URLs checked for duplicates and overlap: total 50 unique rendered pages. Four exact Harmony 4 colours are now confirmed, bringing the combined confirmed Harmony selection from nine to thirteen colours.

| Harmony 4 colour | Hex | Confirmed treatment |
| --- | --- | --- |
| Barrier Reef Teal | #00A89B | Teal heading-gradient endpoint and Senior College illustrations |
| Barrier Reef Teal D2 | #00766C | Dark endpoint of teal heading gradients |
| Outback Indigo | #091135 | Dark endpoint of indigo heading gradients |
| Outback Indigo L3 | #2F4370 | Lighter endpoint of indigo heading gradients |

- [Clean Energy Batteries](https://tafeqld.edu.au/about/centres-of-excellence/clean-energy-batteries): QUT Energy Storage Research Group and SL Batteries headings use the indigo pair; Top reasons to pursue a career in the battery industry uses the teal pair.
- [Health Care and Support](https://tafeqld.edu.au/about/centres-of-excellence/health-care-and-support): Grantee in focus: Veri Health Media uses the teal pair.
- [Applied Research Grants](https://tafeqld.edu.au/about/centres-of-excellence/applied-research-grants): QUT Energy Storage Research Group and SL Batteries use the indigo pair; Veri Health Media uses the teal pair. Both gradient treatments were visually verified in screenshots. Heading computed styles have `background-clip: text`, transparent text colour, and the exact gradient endpoint RGB values; these are painted headings, not merely unused variables.
- [Senior College](https://tafeqld.edu.au/courses/study-areas/education-and-community/high-school-learning-and-university-preparation/senior-college): the loaded, visible Belong, Learn and Launch SVG illustrations use `#00A89B` with `#373234`. Exact fills were checked in the linked SVG sources and the illustrations were visually verified on the page. Assets: `work-placement-icon-duo.svg`, `education-and-community-foundation-skills-icon-duo.svg`, and `pathway-to-university-icon-duo.svg` under `/content/dam/tafe/en/site-media/icons/duo/`.

The new 25 comprised four Centre of Excellence subpages (including Construction Tech), fifteen study-area child pages (Cyber security, Applied technology, Government, Sustainability and renewable energy, Agriculture, Veterinary nursing, Maritime, Aviation, Library services, Unilearn, Senior College, Visual arts, Cultural arts, Early childhood education and care, Mental health), and six international/employer/trade pages (Global engagement, International pathways, ELICOS English College, Resources and primary industries, Gilmour Space Tech, Post-trade training). No other Harmony 4 shades were confirmed in the checked states. Photography, PDFs, every viewport and every interaction state remain outside this sample; do not infer a site-wide absence for the six other Harmony 4 shades.

Distinguish exact asset colours: the Health Care and Support `heart_icon_teal.svg` uses `#00B7C6`, outside this Harmony chart. Other similarly named duo icons may also use `#00B7C6`; do not infer fills from filenames or visual resemblance. Site-wide ordinary link/event teals remain separate from the confirmed Barrier Reef heading and Senior College icon use.

## Additional random 50-page review: 16 October 2026

Reviewed another 50 distinct public pages, bringing the cumulative browser sample to 100 pages. No additional exact Harmony colours were found; the confirmed selection remains 13, including the four Harmony 4 colours above.

Selection was independent of colour findings: deterministic pseudorandom SHA-256 ranking using seed `20261016` over 2,871 eligible URLs from the public sitemap, after excluding the previous 50. The sample contained 37 news articles, nine course pages and four other pages (international appointments, Bundaberg campus, What it costs, and Studiosity). All 50 returned valid pages, had matching canonical URLs, and had no overlap or duplicates; no replacements were needed.

Each selected page was inspected in the browser at its initial state and after scrolling, comparing computed text, backgrounds, borders, gradients, outlines, decorations and vector-shape colours with all 37 unique supplied Harmony colours. Page source and all 28 unique externally referenced SVG assets were also screened; no additional Harmony shade was found. A repeated use of Outback Indigo `#091135` and Outback Indigo L3 `#2F4370` occurs in the H1 heading gradient on [TAFE Centre of Excellence Clean Energy Batteries awards round one grants](https://tafeqld.edu.au/news-and-events/news/2025/tafe-centre-of-excellence-clean-energy-batteries-awards-round-on).

The findings cover sampled rendered desktop states and exact interface/vector colours. Photography, raster-image pixel matching, PDFs and exhaustive responsive/interaction states were excluded. Do not present 13 as an exhaustive whole-site colour inventory. The reproducible URL selection, source evidence, SVG evidence and compact root-browser summary are saved in the thread's visualization directory as `random50-selection.json`, `random50-source-evidence.json`, `random50-svg-evidence.json`, and `random50-rendered-summary.json`.
