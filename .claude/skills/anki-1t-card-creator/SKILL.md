---
name: anki-1t-card-creator
description: Create high-quality Japanese Anki flashcards following the AJATT (All Japanese All The Time) 1T (one-target) sentence methodology. Use this skill when the user requests creating Japanese vocabulary cards, sentence mining cards, or wants to add words to their Anki deck. The skill creates cards with proper context sentences, furigana readings, pitch accent patterns, definitions, and optional images. Cards are added to the "DEFAULT::1. Custom::Mined" deck with a "Claude" tag. The skill uses the "Kiku" note type and follows the format of the user's existing mined cards. Relies on the local `anki-connect` skill to talk to AnkiConnect at http://127.0.0.1:8765.
---

# Anki 1T Card Creator

Create Japanese sentence mining flashcards following AJATT methodology. Cards focus on ONE unknown word (1T = one target) per card with natural context sentences.

## Dependencies

This skill **delegates all AnkiConnect calls** to the project-local `anki-connect` skill (`.claude/skills/anki-connect/SKILL.md`). That skill owns:

- Preflight check that Anki is running and AnkiConnect responds at `http://127.0.0.1:8765`
- JSON request construction (`action`, `version: 6`, `params`)
- Error handling (always check `error` before using `result`)
- Confirmation gating on destructive operations (`addNote`, `updateNoteFields`, `deleteNotes`, etc.)

When this skill needs to add or look up a note, follow the `anki-connect` skill's request/response conventions. Do **not** bypass its confirmation policy — `addNote` requires user confirmation per its rules.

The AnkiConnect actions used by this skill:

- `findNotes` — duplicate check before adding
- `modelFieldNames` — verify Kiku field names match before first add in a session (optional, run once per session if uncertain)
- `addNote` — create the card
- `notesInfo` — verify the added note after creation (optional)

See `references/anki_tools.md` for full request payloads.

## Card Structure

Use the **"Kiku"** note type with these fields:

| Field | Description | Format |
|-------|-------------|--------|
| Expression | Target word in kanji | 感激 |
| ExpressionFurigana | Word with furigana reading | 感激[かんげき] |
| ExpressionReading | Kana-only reading (optional) | かんげき |
| ExpressionAudio | Word audio (leave empty) | [sound:filename.ogg] |
| SelectionText | Selected text from source (optional) | |
| MainDefinition | Primary definition(s) | deep emotion; impression; inspiration |
| DefinitionPicture | Image for definition (optional) | `<img src="image.jpeg">` |
| Sentence | Example sentence with target **bolded** | その言葉に`<b>`感激`</b>`して泣いた。 |
| SentenceFurigana | Sentence with furigana annotations | その 言葉[ことば]に 感激[かんげき]して 泣[な]いた。 |
| SentenceAudio | Sentence audio (leave empty) | [sound:filename.mp3] |
| SentenceTranslation | Natural English translation | I was so moved by those words that I cried. |
| Picture | Image (optional) | `<img src="image.jpeg">` |
| Glossary | Vocabulary comparison, contrasts & memory hooks | See Glossary section |
| Hint | Hint text for review (optional) | |
| IsWordAndSentenceCard | Card type flag | Leave empty |
| IsClickCard | Card type flag | Leave empty |
| IsSentenceCard | Card type flag | Leave empty |
| IsAudioCard | Card type flag | Leave empty |
| PitchPosition | Pitch position data (optional) | |
| PitchCategories | Pitch category (optional) | |
| PitchNum | Pitch accent number | 0, 1, 2, etc. |
| PitchPattern | Pitch accent HTML visualization | See pitch pattern section |
| Frequency | Word frequency (optional) | |
| FreqSort | Frequency sort value (optional) | |
| MiscInfo | Miscellaneous info (optional) | |
| Notes | Additional notes | Created by Claude |
| Source | Source material | |
| SourceURL | Link to source | |
| MakeProductionCard | Production card flag | Leave empty |
| Focus | Focus field | Leave empty |

## Field Grouping (Multiple Sentences & Images)

The Kiku note type supports **field grouping** — multiple sentences, images, and audio clips on a single card, each displayed as a separate "page" that the user can swipe through during review. This is the preferred approach: **always add 2-3 example sentences per card** to show the target word in different contexts.

Reference: https://kiku-docs.vercel.app/field-grouping.html

### How Grouping Works

Fields are linked together using `data-group-id` attributes. Each unique `data-group-id` creates a new page in the card. Content **without** a `data-group-id` is shown on its own default page.

Groupable fields: **Sentence**, **SentenceFurigana**, **SentenceTranslation**, **SentenceAudio**, **Picture**, **MiscInfo**

### Rules

- `data-group-id` must be a **positive integer**. Kiku sorts pages in **descending** order of group ID (highest first).
- If `data-group-id` is a Unix timestamp (year 2000–2100), Kiku displays it as a date.
- Each group may contain **at most one Picture**.
- Ungrouped content (no `data-group-id` wrapper) appears on its own default page.
- **All fields in the same group must use the same `data-group-id` value.** This keeps sentences, translations, audio, and pictures in sync when paging through groups.

### HTML Format

**Pictures**: Add `data-group-id` directly to the `<img>` tag:
```html
<img data-group-id="11" src="image1.jpeg"><img data-group-id="10" src="image2.jpeg"><img src="image_default.webp">
```

**Sentences, SentenceFurigana, SentenceTranslation, SentenceAudio, MiscInfo**: Wrap in `<span data-group-id="N">`:
```html
<span data-group-id="11">これで 少しは世の中に<b>貢献</b>できるかな</span><span data-group-id="10">どうせ勇者の捕縛に<b>貢献</b>すれば➡</span>このお店に<b>貢献</b>するために―
```

Note: The ungrouped sentence at the end (`このお店に貢献するために―`) has no span wrapper and displays on the default page.

### Example: Card with 3 Sentences (no images/audio)

When Claude creates cards, we typically don't have images or audio, so we group **Sentence**, **SentenceFurigana**, and **SentenceTranslation** together. Each translation is wrapped with the same `data-group-id` as its corresponding sentence, so the correct translation displays on the correct page.

For a word like 貢献 with 3 example sentences:

```
Sentence:
<span data-group-id="12">これで少しは世の中に<b>貢献</b>できるかな</span><span data-group-id="11">チームの勝利に<b>貢献</b>した。</span>このお店に<b>貢献</b>するために―

SentenceFurigana:
<span data-group-id="12">これで 少[すこ]しは 世[よ]の 中[なか]に<b> 貢献[こうけん]</b>できるかな</span><span data-group-id="11">チームの 勝利[しょうり]に<b> 貢献[こうけん]</b>した。</span>このお 店[みせ]に<b> 貢献[こうけん]</b>するために―

SentenceTranslation:
<span data-group-id="12">I wonder if I can contribute to society a little with this.</span><span data-group-id="11">I contributed to the team's victory.</span>In order to contribute to this shop―
```

### Numbering Convention for Claude-created Cards

When creating cards with N sentences (typically 2-3), use this pattern:
- Sentence N (shown first due to descending sort): `data-group-id="N"` (e.g., `"12"`)
- Sentence N-1: `data-group-id="N-1"` (e.g., `"11"`)
- ...
- Sentence 1 (default page): **no wrapper** (ungrouped)

This keeps the default/primary sentence as the unwrapped one and additional sentences in descending group IDs.

**For single-sentence notes, grouping is not needed.** Only add `data-group-id` when the note has 2+ sentences.

## Creation Workflow

### 1. When User Requests a Card

Extract key information:
- **Target word** (the vocabulary to learn)
- **Context** (where they encountered it, or ask for usage context)
- **JLPT level hint** (if mentioned, for appropriate sentence difficulty)

### 2. Generate Card Content

#### Sentence Selection (1T Principle)
- The sentence should have ONLY ONE unknown word (the target)
- All other vocabulary should be common/known
- Sentence should demonstrate natural, authentic usage
- Prefer shorter sentences (under 20 characters when possible)
- Avoid textbook-style sentences; use natural Japanese

#### Multiple Example Sentences (Preferred)
**Always generate 2-3 example sentences** per card using field grouping (see above). This gives the learner multiple contexts during review. Each sentence should:
- Show a different usage, nuance, or grammatical pattern of the target word
- Vary formality levels (casual, polite, formal) when applicable
- Include common collocations (word pairings)
- All follow the 1T principle independently

Use field grouping to put all sentences in the **Sentence**, **SentenceFurigana**, and **SentenceTranslation** fields with matching `data-group-id` wrappers. Put the primary/best sentence as the ungrouped (default) one.

#### Definitions
Provide in `MainDefinition`:
- Core meaning(s) in English, separated by semicolons
- Keep concise but comprehensive

#### Glossary (Vocabulary Comparison & Memory Hooks)

The `Glossary` field is a **critical learning aid** that helps the learner deeply understand the target word by comparing it to similar/confusable words and providing memory hooks. **Always populate this field** for vocabulary and expression cards. Use HTML formatting for readability.

**Structure the Glossary with these sections (include whichever are relevant):**

1. **Japanese synonyms/related words** — List 2-4 related Japanese words with readings, brief English gloss, and how they differ from the target word.

2. **Must-know contrasts** — Highlight the most important distinctions the learner needs to internalize. Use clear formatting with ✓/❌ examples showing correct vs incorrect usage. Focus on:
   - Words that are easily confused (homophones, similar kanji, overlapping meanings)
   - Pairs where usage context differs (formal vs casual, transitive vs intransitive)
   - Nuance differences (broader vs narrower meaning, emotional tone)

3. **Usage scope** — If the target word is an umbrella term or has a specific scope, show the range with examples.

4. **Memory hook** — A mnemonic to anchor the word. Effective hooks include:
   - Kanji component breakdown (e.g., 鳴 = 口 mouth + 鳥 bird → "a bird's mouth" → living voice)
   - Visual/spatial associations from radical meanings
   - Connections to already-known words
   - Short memorable phrases or images

5. **Key patterns** — Common grammatical patterns, collocations, or set phrases.

**Formatting conventions:**
- `<b>` for emphasis on key words and the target word
- `<br>` for line breaks
- `・` for list items
- `→` for implications/connections
- `⚠️` for critical contrasts or common mistakes
- `✓` and `❌` for correct/incorrect usage examples
- `　` (full-width space) for indentation
- `（例文）` to reference example sentences that illustrate a point

**Full example** (for 鳴く):
```html
<b>Japanese synonyms:</b><br>
・<b>吠える</b>（ほえる）— to bark, bay → stronger/aggressive; 鳴く is the neutral umbrella verb<br>
・<b>泣く</b>（なく）— ⚠️ HOMOPHONE! to cry/weep (humans) → same reading, different kanji<br>
・<b>鳴る</b>（なる）— ⚠️ KEY contrast! a non-living thing makes a sound<br>
<br>
<b>⚠️ Must-know contrast: 鳴く vs 鳴る</b><br>
鳴く（なく）= <b>a living creature makes its characteristic call</b><br>
　→ Subject: birds, cats, dogs, frogs, insects<br>
鳴る（なる）= <b>a non-living thing makes a sound</b><br>
　→ Subject: phone, bell, alarm, thunder, stomach<br>
<br>
→ 鳥が<b>鳴く</b> ✓ / 携帯が<b>鳴る</b> ✓<br>
→ 鳥が鳴る ❌ / 携帯が鳴く ❌<br>
<br>
<b>⚠️ Critical homophone: 鳴く vs 泣く (both なく!)</b><br>
鳴く = animal sounds → 鳴 contains <b>鳥</b> (bird) → always non-human<br>
泣く = human crying → 泣 contains <b>氵</b> (water/tears) → always human<br>
<br>
<b>Memory hook:</b> 鳴 = 口（mouth）+ 鳥（bird）→ <i>「鳥の口」</i> → <b>a bird's mouth</b> → living voice<br>
<br>
<b>Key patterns:</b><br>
・鳴き声（なきごえ）— a call / birdsong (noun form)<br>
・鳴かせる — make someone "sing" = confess (slang)
```

**Simpler example** (for 感激):
```html
<b>Japanese synonyms:</b><br>
・<b>感動</b>（かんどう）— broader "being moved/touched"; 感激 is stronger, more intense<br>
・<b>感銘</b>（かんめい）— deep impression; more formal/literary than 感激<br>
・<b>感心</b>（かんしん）— being impressed (by skill/effort); 感激 is more emotional<br>
<br>
<b>⚠️ Key contrast: 感激 vs 感動</b><br>
感動 = moved/touched (broad, mild to strong)<br>
感激 = <b>overwhelmingly</b> moved (always intense, often to tears)<br>
　→ 映画に感動した ✓（normal reaction to a good movie）<br>
　→ 映画に感激した ✓（so moved you might cry）<br>
<br>
<b>Memory hook:</b> 感激 = 感（feel）+ 激（violent/intense）→ feelings so intense they <b>overwhelm</b> you<br>
<br>
<b>Key patterns:</b><br>
・〜に感激する — to be deeply moved by ~<br>
・感激的な — deeply moving (na-adj)
```

**Adapt depth to the word:** Simple, unambiguous words get a shorter glossary (just synonyms + memory hook). Words with confusable homophones, tricky contrasts, or nuanced usage get the full treatment.

#### Furigana Format
Use bracket notation: `漢字[かんじ]`
- Apply to ALL kanji in the sentence
- For words with multiple kanji: `読書[どくしょ]`
- For mixed: `食べる[たべる]` → 食[た]べる

### 3. Add to Anki

Use the `anki-connect` skill to send an `addNote` request. The fixed parameters for every card created by this skill:

```
Deck: DEFAULT::1. Custom::Mined
Model: Kiku
Tags: ["Claude"]
```

Confirmation is required (per `anki-connect` skill policy) — present the full field payload to the user before the `addNote` call, then send on approval.

Before calling `addNote`, run `findNotes` with `query: "Expression:<target>"` to detect duplicates. If a match exists, surface it to the user and ask whether to proceed, skip, or update.

See `references/anki_tools.md` for full request payloads (single sentence and grouped multi-sentence).

## Pitch Accent Patterns

Format pitch accent using HTML box-shadow styling in the `PitchPattern` field. Use katakana for the reading. For nasal sounds (ガ行鼻濁音), use the ° marker after the character (e.g., ケ゚).

- **0 (平板/heiban)**: Flat pattern — low first mora, rest high:
  `<span style="box-shadow: inset -2px -2px 0 0 #FF6633;">カ</span><span style="box-shadow: inset 0px 2px 0 0px #FF6633;">ンケ゚キ</span> <span class="pitch_number">0</span>`

- **1 (頭高/atamadaka)**: Drop after first mora:
  `<span style="box-shadow: inset -2px 2px 0 0px #FF6633;">ド</span><span style="box-shadow: inset 0px -2px 0 0px #FF6633;">クシャ</span> <span class="pitch_number">1</span>`

- **N (中高/nakadaka)**: Drop after N-th mora

- **N (尾高/odaka)**: Drop at the end

Set `PitchNum` to the corresponding number. When pitch is unknown, leave both `PitchPattern` and `PitchNum` empty.

## Image Generation

When the user requests an image or when a visual would enhance understanding:

1. **Generate contextual images** using available tools
2. **Save to Anki media folder** or provide for manual addition (use AnkiConnect `storeMediaFile` via the `anki-connect` skill if uploading directly)
3. Use `Picture` field for general images: `<img src="filename.jpeg">`
4. Use `DefinitionPicture` for definition-specific images

Prefer images that:
- Illustrate the concept clearly
- Are simple and memorable
- Complement (not replace) the textual definition

## Example Card Creation

**User**: Create a card for 感激

**Generated Content**:
```
Expression: 感激
ExpressionFurigana: 感激[かんげき]
MainDefinition: deep emotion; being deeply moved; impression; gratitude
Sentence: <span data-group-id="12">彼女の優勝に<b>感激</b>した。</span><span data-group-id="11">先生の優しさに<b>感激</b>して泣いてしまった。</span>その言葉に<b>感激</b>して涙が出た。
SentenceFurigana: <span data-group-id="12"> 彼女[かのじょ]の 優勝[ゆうしょう]に<b> 感激[かんげき]</b>した。</span><span data-group-id="11"> 先生[せんせい]の 優[やさ]しさに<b> 感激[かんげき]</b>して 泣[な]いてしまった。</span>その 言葉[ことば]に<b> 感激[かんげき]</b>して 涙[なみだ]が 出[で]た。
SentenceTranslation: <span data-group-id="12">I was moved by her victory.</span><span data-group-id="11">I was so moved by the teacher's kindness that I cried.</span>I was so moved by those words that tears came out.
Glossary: <b>Japanese synonyms:</b><br>・<b>感動</b>（かんどう）— broader "being moved/touched"; 感激 is stronger, more intense<br>・<b>感銘</b>（かんめい）— deep impression; more formal/literary than 感激<br>・<b>感心</b>（かんしん）— being impressed (by skill/effort); 感激 is more emotional<br><br><b>⚠️ Key contrast: 感激 vs 感動</b><br>感動 = moved/touched (broad, mild to strong)<br>感激 = <b>overwhelmingly</b> moved (always intense, often to tears)<br>　→ 映画に感動した ✓（normal reaction to a good movie）<br>　→ 映画に感激した ✓（so moved you might cry）<br><br><b>Memory hook:</b> 感激 = 感（feel）+ 激（violent/intense）→ feelings so intense they <b>overwhelm</b> you<br><br><b>Key patterns:</b><br>・〜に感激する — to be deeply moved by ~<br>・感激的な — deeply moving (na-adj)
PitchPattern: <span style="box-shadow: inset -2px -2px 0 0 #FF6633;">カ</span><span style="box-shadow: inset 0px 2px 0 0px #FF6633;">ンケ゚キ</span> <span class="pitch_number">0</span>
Notes: Created by Claude. Na-adjective usage also possible: 感激的な.
```

Note: 3 sentences are provided using field grouping. The default (ungrouped) sentence is the primary one shown on the first page. Group IDs 12 and 11 create additional pages. Each SentenceTranslation is grouped with the same `data-group-id` as its corresponding sentence.

## Notes Field Convention

The Notes field should include:
- "Created by Claude." prefix
- Usage context, register notes, related expressions
- Common conjugations or grammatical patterns
- Grammar pattern info (JLPT level, formation rules)

Example:
```
Notes: Created by Claude. Na-adjective usage also possible: 感激的な. Related: 感動 (similar but broader), 感銘を受ける (to be impressed).
```

## Quality Checklist

Before adding a card, verify:
- [ ] Only ONE target word is unknown (1T principle)
- [ ] Sentence sounds natural (not textbook Japanese)
- [ ] Furigana is complete and accurate
- [ ] Definition is concise but comprehensive
- [ ] Translation captures meaning (not word-for-word)
- [ ] Glossary includes synonyms, key contrasts, and a memory hook
- [ ] Field grouping is consistent (same `data-group-id` across Sentence, SentenceFurigana, and SentenceTranslation)
- [ ] "Claude" tag is included
- [ ] Duplicate check ran via `findNotes` and result was resolved with the user

## Common Patterns

### Verbs
- Show in context, not dictionary form
- Include common conjugations in notes

### Na-adjectives
- Show with な or に usage
- Note if also used as noun

### Compound words
- Break down components if helpful
- Note related words

### Onomatopoeia
- Explain sound/feeling
- Provide similar expressions
