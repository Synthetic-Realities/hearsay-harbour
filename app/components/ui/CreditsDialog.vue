<script setup lang="ts">
import { PACKS } from '~/utils/content'
import { useGame } from '~/stores/game'

const game = useGame()
const pictures = computed(() => PACKS.flatMap(p => p.pictures.map(pic => ({ ...pic, level: p.level }))))
const linkify = (s: string) => s.split(/(https?:\/\/\S+?)(?=[),.]?(?:\s|$))/g)
</script>

<template>
  <UiDialog kicker="Hearsay Harbour" title="Credits" @close="game.close()">
    <section>
      <p class="lead">
        An academic research project of <strong>Synthetic Realities</strong>, led by
        <strong>Dr Sam Martin</strong>, Smart Data Research UK (UKRI) Fellow (Grant number UKRI4010),
        Manchester Metropolitan University (MMU).
        ORCID: <a href="https://orcid.org/0000-0002-4466-8374" target="_blank" rel="noopener">0000-0002-4466-8374</a>.
      </p>
      <p>
        Part of <a href="https://github.com/Synthetic-Realities/sda-vision-source" target="_blank" rel="noopener">SDA Vision</a>,
        following its community workshop method: Notice, Discuss, Check, Reflect.
      </p>
    </section>

    <section>
      <h3>Code and citation</h3>
      <p>
        Source code: <a href="https://github.com/Synthetic-Realities/hearsay-harbour" target="_blank" rel="noopener">github.com/Synthetic-Realities/hearsay-harbour</a>
        <br>
        Archived on Zenodo: <a href="https://doi.org/10.5281/zenodo.23243671" target="_blank" rel="noopener">doi.org/10.5281/zenodo.23243671</a>
        <span class="soft">(always the latest version)</span>
        <br>
        Play online: <a href="https://synthetic-realities.github.io/hearsay-harbour/" target="_blank" rel="noopener">synthetic-realities.github.io/hearsay-harbour</a>
      </p>
    </section>

    <section>
      <h3>Original game</h3>
      <p>
        The look and feel, and some of the code, come from
        <a href="https://github.com/zernonia/hivebound" target="_blank" rel="noopener">Hivebound</a> by zernonia,
        a cosy bee exploration game, used under the MIT Licence.
      </p>
    </section>

    <section>
      <h3>Pictures</h3>
      <ul class="pics">
        <li v-for="p in pictures" :key="p.id">
          <strong>{{ p.title ?? p.claim }}</strong>
          <span v-if="p.madeWith">Made with: {{ p.madeWith }}</span>
          <span class="soft">
            <template v-for="(bit, i) in linkify(p.source ?? 'Source to be confirmed.')" :key="i">
              <a v-if="bit.startsWith('http')" :href="bit" target="_blank" rel="noopener">{{ bit }}</a>
              <template v-else>{{ bit }}</template>
            </template>
          </span>
        </li>
      </ul>
    </section>

    <section>
      <h3>Made with</h3>
      <p class="soft">
        Nuxt, Vue, TresJS and three.js. Fredoka and Patrick Hand fonts (SIL Open Font Licence).
        Every model and sound is made in code.
        Hearsay Harbour's code is released under the MIT Licence.
      </p>
    </section>

    <template #footer>
      <button autofocus class="big-btn" data-continue @click="game.close()">
        Back
      </button>
    </template>
  </UiDialog>
</template>

<style scoped>
section + section {
  margin-top: 16px;
}
p {
  margin: 0 0 8px;
  line-height: 1.5;
}
.lead {
  font-size: 1.02rem;
}
h3 {
  margin: 0 0 6px;
  font-size: 1.05rem;
}
a {
  color: var(--sea-deep);
  font-weight: 600;
  overflow-wrap: anywhere;
}
.soft {
  color: var(--ink-soft);
}
.pics {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
  font-size: 0.9rem;
}
.pics li {
  display: grid;
  gap: 2px;
}
</style>
