---
name: import-pictures
description: Import new pictures from content-inbox/ into Hearsay Harbour's level packs. One agent drafts each picture's villager lines, check findings and spots from the image and the facilitator's notes; a second, independent agent reviews the draft against the image before it is written as a draft entry. Use when the user says "import the pictures", "/import-pictures", or has added images to content-inbox.
---

# Import pictures into Hearsay Harbour

The facilitator drops pictures into `content-inbox/` (directly, or through the Dev Studio on the
title screen in `npm run dev`). Each picture `name.ext` may have a sidecar `name.json`:

```json
{ "id": "flood-street", "truth": "ai", "level": 2, "claim": "Town centre underwater this morning!",
  "source": "Generated for the workshop with an image tool, 2026", "notes": "Point out the railings" }
```

The sidecar's `target` says where the picture goes:
- `"mode": "new"`: a new level, numbered `level`, named `levelTitle` with `levelBlurb`. If a pack for
  that level number already exists, ask the user whether to add to it or pick another number.
- `"mode": "add"`: append to the existing pack whose `id` is `packId`.
- `"mode": "replace"`: put the new picture in place of the picture `replaces` in pack `packId`, at the
  same position. **Confirm with the user before replacing**, and first save the old entry (its JSON)
  and its image to `content-inbox/replaced/<date>-<old id>/`, so it can be restored. Delete the old
  image from `public/pictures/` only after that copy exists, and only if no other entry uses it.

`secondOpinions` holds replies the facilitator pasted from Gemini (which can check Google's SynthID
watermark) and OpenAI's image verifier. They're evidence for the facilitator, not a verdict: they never
set `truth`. A reported watermark match may be described in the wax seal finding as what the
facilitator's check found, with its stated coverage; a no-match result leaves the origin open and
must not be written up as proof the picture is real.

If the sidecar has an `aiAssist` value, an AI model suggested some fields in the Studio (listed after
the last colon): treat those as unchecked drafts, never as facts about where the picture came from.

`truth` is one of `camera`, `edited`, `drawn` (hand-drawn or illustrated by a person), `assisted`, `ai`,
`unknown`. `madeWith` is the picture's credential shown to players at the reveal (e.g. "ChatGPT (OpenAI
image generation)" or "Phone camera, by Dr Sam Martin").

## Ground rules (read these first)

- **Never decide the truth from the pixels.** `truth` comes only from the sidecar. If it is missing
  or `unknown`, leave that picture in the inbox and ask the user how it was made.
- **Never invent provenance.** Check findings (tide search, wax seal, label crate) may only state facts
  from `source`/`notes` or from the file itself. Without a known source, write the honest generic
  finding ("Nothing comes back…", "No seal…") with strength `none` or `some`.
- Don't identify real private people in pictures. If a picture shows an identifiable private person
  or a child, stop and check with the user before importing it.
- Everything imported gets `"status": "draft"`. Only the user marks entries `reviewed`.

## Steps

1. **Read the inbox.** List images in `content-inbox/` (not `imported/`). Read each sidecar. Read one
   existing entry in `app/packs/level-1-harbour-basics.json` as the house style reference, and
   `app/utils/content.ts` for the `Picture` type and the villagers (Wren, Pip, Moss).

2. **Measure the file.** For each image, run `sips -g pixelWidth -g pixelHeight -g make -g model -g creation <file>`
   so the label-crate finding reports real dimensions and whatever metadata exists.

3. **Draft (agent 1, the author).** Spawn one Agent per picture (in parallel for several) with:
   the image path (tell it to view the image with Read), the sidecar, the measured file facts, the
   ground rules above, and the house style entry. Ask it to return one JSON `Picture` object:
   - `id`, `src` (`<id>.<ext>`), `arrival` (a cozy one-liner about how it reaches the harbour),
     `claim` (from the sidecar, or a realistic share caption that matches the picture), `truth`,
     `close` (neighbouring labels that deserve partial credit), `source` and `madeWith` (copied from the
     sidecar; every picture needs a `madeWith` credential, so ask the user if it's missing).
   - `takes` for `wren` (light, lenses, focus; a Sikh elder and retired photographer), `pip`
     (text and small details; a sharp-eyed seven-year-old girl) and `moss` (context: who shared it
     and why; a young fisher boy), and `jim` (Grumpy Professor Jim, a grumpy retired professor and
     conspiracy theorist with a grey ponytail who says *every* picture is AI: his lean is always `ai`,
     he is funny rather than mean, and he never repeats or endorses a harmful false claim such as
     anti-vaccine content). First person, one or two short sentences each, each with a `lean`. Jim aside, at least one villager should lean differently from the others, and at least one
     should be wrong on harder levels. Leans are hunches, never certainties.
   - `checks.tide`, `checks.seal`, `checks.crate`: `headline`, `body`, `strength`, optional `points`.
   - `cues`: 3–4 spots, each `{ x, y, note }` with x, y from 0 to 1 (left/top = 0), placed on the
     feature the note describes. Notes are short and plain. Include at least one cue that *doesn't*
     prove anything on its own (e.g. clean text, which modern AI can produce).
   - `verdict` (what it was, in two sentences) and `lesson` (the one transferable idea).
   Level 2+ should be harder: subtler artefacts, a plausible caption, and villagers who disagree.

4. **Review (agent 2, independent).** Spawn a separate Agent that has **not** seen the author's
   reasoning. Give it the image path, the sidecar, the ground rules and the draft JSON. Ask it to:
   - view the image itself and, for each cue, say where that feature actually is (its own x, y);
     flag any cue more than 0.08 away from its own estimate, and give corrected coordinates;
   - flag any fact in the checks, verdict or takes that isn't supported by the sidecar or file;
   - check the villagers stay in character and that the reading level suits ages 10 and up;
   - return `{ "approved": boolean, "fixes": [...], "corrected": <full Picture JSON> }`.

5. **Reconcile.** Apply the reviewer's corrections. If the two agents disagree on a fact or a cue
   and you can't settle it by looking at the image yourself, keep the more cautious version and
   note it for the user.

6. **Write the files.**
   - Resize and copy the image: `sips -Z 1400 <inbox file> --out public/pictures/<id>.<ext>`
     (skip the resize for images already under 1400px).
   - Add the entry, with `"status": "draft"`, to `app/packs/level-<N>-*.json` for the sidecar's
     level. If that pack doesn't exist, create it with `id`, `level`, `title`, `blurb` (ask the user
     for a title, or propose one) and `pictures`.
   - Move the image and sidecar to `content-inbox/imported/`.

7. **Validate.** Run `npm run validate` and fix anything it reports. Then run `npx nuxt typecheck`.

8. **Report.** For each picture: the level, the truth, the cues, any reviewer fixes, and anything
   you need the user to confirm. Remind them to play the level and change `status` to `reviewed`
   once they're happy.
