# Hearsay Harbour

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23237555.svg)](https://doi.org/10.5281/zenodo.23237555)

**Play it:** https://intothedigital.github.io/hearsay-harbour/

A cozy island game about working out how a picture was made before you share it.
It's built on the SDA Vision community workshop method: **Notice → Discuss → Check → Reflect**.

You're a puffin, the new keeper of the village noticeboard. Pictures arrive all day
by gull, bottle and ferry. For each one you:

1. **Notice**: drop up to three "hunch pebbles" on the picture and record a first impression.
2. **Discuss**: ask the villagers. They often disagree, on purpose.
   - **Wren**, a Sikh elder and retired photographer, reads light, focus and lenses.
   - **Pip**, a sharp-eyed seven-year-old girl with a magnifying glass, spots text and small details.
   - **Moss**, a young fisher boy who hears all the harbour gossip, asks who shared it and why.
   - **Grumpy Professor Jim**, a retired professor and conspiracy theorist with a grey ponytail, says
     *every* picture is AI. The game points out that an opinion which never changes isn't evidence.
3. **Check**: use the tools around the harbour:
   - **Tide search** at the end of the pier (a fishing game standing in for reverse image search)
   - **Wax seal** at the post office (content credentials / C2PA)
   - **Label crate** on the dock (file details / metadata)
4. **Reflect**: back at the board, choose a label (Camera-made, Edited photo, AI-assisted,
   AI-generated or **Still unsure**) and a caption for sharing it.

A five-page **welcome guide** opens at the start: where you are (with a labelled island map),
the mission, who to ask, the tools, and how to move around. The map and guide buttons at
the top bring it back at any time. Name tags float over every villager and tool, and a
"what to do next" line under the step tracker always says what to try.

A **honey trail** of glowing stepping stones and a **Next** button always show where to go next,
and the honey diamonds mark places you haven't visited for the current picture.

The trust garden by the board grows or wilts with your answers. An honest "Still unsure"
after a proper look earns a bloom. A confident wrong answer costs more, and giving in to
the **Share gull** (sharing your first impression without checking) costs the most.
When all six pictures are done, the village celebrates with fireworks and the player gets a **reward**:
a medal, a keeper's rank and up to three stars (Sharp eye, Thorough, Patient), with a certificate
they can put their name on. Then the recap lets the group revisit every finding and gives
discussion prompts.

## Workshop mode

Choose **Run a workshop** on the title screen to run the game on a projector for a room:

- A **facilitator panel** shows the prompt for the current activity (Notice, Discuss, Check, Reflect),
  following the SDA Vision facilitator guide.
- At **Notice** and again at **Reflect**, enter the room's show of hands (camera / AI / can't tell).
- The **reveal** compares the room's first and final votes, and the **recap** lists them for every picture.
- **Copy findings** or **Download findings** gives a CSV of everything recorded, for notes or research.

Progress saves in the browser as you go, so a refresh doesn't lose the day ("Continue your day" on the title screen).

Drag to look around the island, scroll or pinch to zoom, or use the **+ − ◎** buttons
(keys `+`, `-`, `C`). Hopping anywhere brings the view back to the puffin.

## Running it

**On a Mac, double-click `Start Hearsay Harbour.command`** (there's a shortcut on the Desktop).
It installs what it needs the first time, starts the game and opens it in your browser.
Close the Terminal window to stop it.

From a terminal (Node 22 or newer is recommended; Node 20 works but Nuxt warns about it):

```bash
npm install
npm run dev          # http://localhost:3000
npm run generate     # static site in .output/public; runs from any folder or host
```

## Levels and pictures

Each level is a **picture pack**: a JSON file in `app/packs/` (e.g. `level-1-harbour-basics.json`),
with the image files in `public/pictures/`. When there's more than one pack, the title screen
lets players choose a level. For each picture a pack sets the caption it arrives with, the
truth, what each villager thinks, what each check finds, the spots revealed at the end
(as 0–1 positions on the image) and the closing lesson. `npm run validate` checks every pack.

### Adding new pictures (for harder levels)

1. Run `npm run dev` and choose **Dev Studio: add pictures** on the title screen (or copy images into
   `content-inbox/`). Say how each picture was really made and where it came from.
2. In Claude Code, in this folder, run **`/import-pictures`**. One agent drafts each picture's villager
   lines, checks and spots; a second, independent agent reviews the draft against the picture and
   your notes, and corrects the spots. The import never guesses how a picture was made and never
   invents where it came from.
3. New entries arrive in the right level pack marked `"status": "draft"`. Play them, edit anything,
   then change the status to `"reviewed"`.

See `content-inbox/README.md` for the details.

> The check results are **scripted for teaching**. They describe what a real check would
> typically find. Confirm them against your own searches before running a workshop.

The current pack uses the six example images from the SDA Vision setup (three camera-made,
three AI-generated).

## Publishing (GitHub and Zenodo)

`npm run generate` builds a static site in `.output/public` that runs from any folder. Every push to
`main` rebuilds it and publishes it to GitHub Pages (`.github/workflows/pages.yml`). Before publishing publicly, check the rights to every
picture in `public/pictures/` (see the note in the picture packs' `source` fields).

## Credits

An academic research project of **Synthetic Realities**, led by **Dr Sam Martin**, Smart Data Research UK
(UKRI) Fellow (Grant number UKRI4010), Manchester Metropolitan University (MMU).
ORCID: [0000-0002-4466-8374](https://orcid.org/0000-0002-4466-8374).
Part of [SDA Vision](https://github.com/Synthetic-Realities/sda-vision-source).

The look and feel, hex helpers and UI tokens are adapted from
[Hivebound](https://github.com/zernonia/hivebound) by zernonia (MIT, see `THIRD_PARTY.md`).
Every model and sound is made in code. Developed with Claude Code.

**Pictures (level 1)**
- Blue Marble: NASA / Apollo 17 crew, 1972 (public domain).
- Cat in a hat: Adobe Firefly example from the [C2PA example assets](https://contentauth.github.io/example-assets/) (MIT).
- Rowan the fox cover: image generated using OpenAI’s image-generation tool in ChatGPT, 8 October 2026.
  Prompt developed collaboratively by Dr Sam Martin and ChatGPT.
  Reference: OpenAI (2026) *Rowan refuses the vaccine* [AI-generated illustration]. Generated using ChatGPT, 8 October.
- SDA comic: created by Dr Sam Martin for the SDA Vision workshops, using a mix of OpenAI’s image-generation tool in ChatGPT and Google Gemini.
- Window cat and washing machine: personal photos by Dr Sam Martin (real, unedited phone photos).

## Licence and citation

Code: [MIT](LICENSE). To cite Hearsay Harbour, see [`CITATION.cff`](CITATION.cff) (GitHub shows a
"Cite this repository" button); `.zenodo.json` sets the metadata for Zenodo's GitHub integration.
