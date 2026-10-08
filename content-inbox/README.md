# Picture inbox

Drop new pictures here to turn them into new levels.

0. **Optional: AI assist.** Copy `.env.example` to `.env`, set your provider, model and key, restart
   `npm run dev`, and switch on **AI assist** in the Studio. It suggests the title, caption and notes for
   each picture you drop in; how it was really made is always your choice.
1. **Add pictures.** Either copy images into this folder, or start the game with `npm run dev` and use
   **Dev Studio: add pictures** on the title screen (it saves the picture and your notes here).
2. **Say how each one was made.** Next to `flood.jpg`, add `flood.json` (the Studio does this for you):

   ```json
   { "truth": "ai", "level": 2, "claim": "Town centre underwater this morning!",
     "source": "Generated for the workshop with an image tool, 2026", "notes": "Point out the railings" }
   ```

   `truth` is `camera`, `edited`, `drawn` (hand-drawn or illustrated), `assisted`, `ai` or `unknown`.
   The import never guesses this. Add `"madeWith"` too (e.g. `"ChatGPT (OpenAI image generation)"`): players
   see it as the picture's credential at the reveal.
   `source` is the only place the checks get their facts from, so be as specific as you can.
   Not sure how it was made? The Studio's **second opinion** panel copies a checking prompt and opens
   Gemini (SynthID) or OpenAI's image verifier; paste their replies back in. They're evidence to weigh,
   not a verdict, so you still choose (or leave it as "Don't know yet").
   The Studio also asks **where it goes**: a new level, an existing level, or in place of an existing
   picture. Replacing keeps a copy of the old picture in `replaced/`.
3. **Import.** In the Studio's **Inbox** tab, choose **Import into the game**. Your AI assist model
   drafts the entry and a second pass checks it. It lands in the right level, **not visible in game**
   yet, and the files move to `imported/`. (Developers can run the `/import-pictures` agent skill instead.)
4. **Check it and switch it on.** In the **Pictures in the game** tab, **Play it** to try it, **Edit**
   anything you'd change, then switch it to **Visible in game**. Remove a picture there too; a copy is
   kept in `removed/`. Deleted inbox pictures go to `deleted/`.

Pictures in this folder are not published with the game and are ignored by git.
