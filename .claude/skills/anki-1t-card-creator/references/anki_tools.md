# Anki Tool Reference

All calls go through the project-local `anki-connect` skill (`.claude/skills/anki-connect/SKILL.md`), which wraps AnkiConnect at `http://127.0.0.1:8765`. Use `version: 6`. Always check `error` before `result`. `addNote` requires user confirmation per the `anki-connect` skill policy.

## Adding a Note (Single Sentence)

For a single sentence, no field grouping is needed:

**AnkiConnect request:**
```json
{
  "action": "addNote",
  "version": 6,
  "params": {
    "note": {
      "deckName": "DEFAULT::1. Custom::Mined",
      "modelName": "Kiku",
      "fields": {
        "Expression": "単語",
        "ExpressionFurigana": "単語[たんご]",
        "ExpressionReading": "",
        "ExpressionAudio": "",
        "SelectionText": "",
        "MainDefinition": "word; vocabulary; term",
        "DefinitionPicture": "",
        "Sentence": "例文に<b>単語</b>を入れる。",
        "SentenceFurigana": "例文[れいぶん]に<b>単語[たんご]</b>を 入[い]れる。",
        "SentenceAudio": "",
        "SentenceTranslation": "Put the word in the example sentence.",
        "Picture": "",
        "Glossary": "<b>Japanese synonyms:</b><br>・<b>語彙</b>（ごい）— vocabulary (as a collection); 単語 is a single word<br>・<b>言葉</b>（ことば）— word/language (broader, everyday); 単語 is more technical/academic<br>・<b>用語</b>（ようご）— terminology; specialized/technical words<br><br><b>⚠️ Key contrast: 単語 vs 言葉</b><br>単語 = <b>a single lexical unit</b> (linguistic/study context)<br>言葉 = word, phrase, or language in general (everyday)<br>　→ 単語を覚える ✓（memorize vocabulary items — study context）<br>　→ いい言葉だね ✓（that's a nice expression — everyday）<br>　→ いい単語だね △（sounds overly technical）<br><br><b>Memory hook:</b> 単語 = 単（single/simple）+ 語（word）→ literally <b>\"a single word\"</b> — the smallest unit you study",
        "Hint": "",
        "IsWordAndSentenceCard": "",
        "IsClickCard": "",
        "IsSentenceCard": "",
        "IsAudioCard": "",
        "PitchPosition": "",
        "PitchCategories": "",
        "PitchNum": "",
        "PitchPattern": "",
        "Frequency": "",
        "FreqSort": "",
        "MiscInfo": "",
        "Notes": "Created by Claude",
        "Source": "",
        "SourceURL": "",
        "MakeProductionCard": "",
        "Focus": ""
      },
      "tags": ["Claude"],
      "options": {
        "allowDuplicate": false,
        "duplicateScope": "deck"
      }
    }
  }
}
```

Send via curl (the `anki-connect` skill formats this; this block shows the wire payload):
```bash
curl -sS -X POST http://127.0.0.1:8765 -d @payload.json
```

## Adding a Note (Multiple Sentences with Field Grouping)

When providing 2-3 sentences, use `data-group-id` on **Sentence**, **SentenceFurigana**, and **SentenceTranslation** (and SentenceAudio/Picture/MiscInfo if available). The primary sentence is ungrouped; additional sentences get descending group IDs.

```json
{
  "action": "addNote",
  "version": 6,
  "params": {
    "note": {
      "deckName": "DEFAULT::1. Custom::Mined",
      "modelName": "Kiku",
      "fields": {
        "Expression": "貢献",
        "ExpressionFurigana": "貢献[こうけん]",
        "ExpressionReading": "",
        "ExpressionAudio": "",
        "SelectionText": "",
        "MainDefinition": "contribution; service",
        "DefinitionPicture": "",
        "Sentence": "<span data-group-id=\"12\">これで少しは世の中に<b>貢献</b>できるかな</span><span data-group-id=\"11\">チームの勝利に<b>貢献</b>した。</span>このお店に<b>貢献</b>するために―",
        "SentenceFurigana": "<span data-group-id=\"12\">これで 少[すこ]しは 世[よ]の 中[なか]に<b> 貢献[こうけん]</b>できるかな</span><span data-group-id=\"11\">チームの 勝利[しょうり]に<b> 貢献[こうけん]</b>した。</span>このお 店[みせ]に<b> 貢献[こうけん]</b>するために―",
        "SentenceAudio": "",
        "SentenceTranslation": "<span data-group-id=\"12\">I wonder if I can contribute to society a little with this.</span><span data-group-id=\"11\">I contributed to the team's victory.</span>In order to contribute to this shop―",
        "Picture": "",
        "Glossary": "<b>Japanese synonyms:</b><br>・<b>寄与</b>（きよ）— contribution (formal/written); 貢献 is more versatile<br>・<b>奉仕</b>（ほうし）— service/volunteer work; implies selflessness, 貢献 focuses on results<br>・<b>協力</b>（きょうりょく）— cooperation; working together, while 貢献 emphasizes your individual impact<br><br><b>⚠️ Key contrast: 貢献 vs 協力</b><br>貢献 = <b>making a meaningful impact</b> (result-focused)<br>協力 = <b>working together</b> (process-focused)<br>　→ チームの勝利に貢献した ✓（I contributed to the win — my impact）<br>　→ チームに協力した ✓（I cooperated with the team — working together）<br><br><b>Memory hook:</b> 貢献 = 貢（tribute）+ 献（offering）→ <b>offering tribute</b> → giving something valuable to a cause<br><br><b>Key patterns:</b><br>・〜に貢献する — to contribute to ~<br>・社会貢献 — social contribution<br>・貢献度 — degree of contribution",
        "Hint": "",
        "IsWordAndSentenceCard": "",
        "IsClickCard": "",
        "IsSentenceCard": "",
        "IsAudioCard": "",
        "PitchPosition": "",
        "PitchCategories": "",
        "PitchNum": "",
        "PitchPattern": "",
        "Frequency": "",
        "FreqSort": "",
        "MiscInfo": "",
        "Notes": "Created by Claude",
        "Source": "",
        "SourceURL": "",
        "MakeProductionCard": "",
        "Focus": ""
      },
      "tags": ["Claude"],
      "options": {
        "allowDuplicate": false,
        "duplicateScope": "deck"
      }
    }
  }
}
```

## Checking for Duplicates

Before `addNote`, run `findNotes` scoped to the target deck:

```json
{
  "action": "findNotes",
  "version": 6,
  "params": {
    "query": "deck:\"DEFAULT::1. Custom::Mined\" Expression:単語"
  }
}
```

If `result` is non-empty, retrieve details with `notesInfo`:

```json
{
  "action": "notesInfo",
  "version": 6,
  "params": { "notes": [<noteId>, ...] }
}
```

Then ask the user whether to skip, proceed with a duplicate (`allowDuplicate: true`), or update the existing note via `updateNoteFields`.

## Verifying Kiku Field Names (Optional, Once per Session)

If unsure the local "Kiku" model matches the field list in this skill, run:

```json
{ "action": "modelFieldNames", "version": 6, "params": { "modelName": "Kiku" } }
```

Compare the returned array against the field table in `SKILL.md` before the first `addNote`.

## Field Details

### Required Fields
- **Expression**: The target vocabulary word (kanji form)
- **ExpressionFurigana**: Word reading in bracket notation: `漢字[よみ]`
- **MainDefinition**: Primary definitions, separated by semicolons
- **Sentence**: Example sentence with `<b>target</b>` tags around the word
- **SentenceFurigana**: Furigana format: `漢字[よみ]`
- **SentenceTranslation**: Natural English translation
- **Glossary**: Vocabulary comparison, contrasts, memory hooks (see SKILL.md Glossary section for format)

### Optional Fields
- **ExpressionReading**: Kana-only reading of the word
- **SelectionText**: Selected text from the source material
- **DefinitionPicture**: Image for the definition (`<img src="filename.jpeg">`)
- **Picture**: General image (`<img src="filename.jpeg">`)
- **Hint**: Hint text shown during review
- **PitchPattern**: HTML-formatted pitch accent visualization
- **PitchNum**: Pitch number (0=heiban, 1=atamadaka, etc.)
- **PitchPosition**: Pitch position data
- **PitchCategories**: Pitch category classification
- **Frequency**: Word frequency value
- **FreqSort**: Frequency sort value
- **MiscInfo**: Any miscellaneous information
- **Notes**: Additional context, usage notes

### Leave Empty
- **ExpressionAudio**: For word audio (manual addition)
- **SentenceAudio**: For sentence audio (manual addition)
- **IsWordAndSentenceCard**: Card type flag
- **IsClickCard**: Card type flag
- **IsSentenceCard**: Card type flag
- **IsAudioCard**: Card type flag
- **MakeProductionCard**: Production card flag
- **Focus**: Focus field
- **Source**: Source material reference
- **SourceURL**: URL to source

## Pitch Accent HTML Patterns

### Heiban (0) - Flat
```html
<span style="box-shadow: inset -2px -2px 0 0 #FF6633;">タ</span><span style="box-shadow: inset 0px 2px 0 0px #FF6633;">ンゴ</span> <span class="pitch_number">0</span>
```

### Atamadaka (1) - Drop after first
```html
<span style="box-shadow: inset -2px 2px 0 0px #FF6633;">タ</span><span style="box-shadow: inset 0px -2px 0 0px #FF6633;">ンゴ</span> <span class="pitch_number">1</span>
```

### Nakadaka (2+) - Drop in middle
```html
<span style="box-shadow: inset -2px -2px 0 0 #FF6633;">タ</span><span style="box-shadow: inset -2px 2px 0 0px #FF6633;">ン</span><span style="box-shadow: inset 0px -2px 0 0px #FF6633;">ゴ</span> <span class="pitch_number">2</span>
```

## Furigana Formatting Rules

1. **Single kanji**: `漢[かん]` → 漢
2. **Compound**: `漢字[かんじ]` → 漢字 (both kanji get single reading)
3. **Mixed okurigana**: `食[た]べる` → 食べる
4. **Multiple readings**: Space-separate in sentence: `今日[きょう] 明日[あした]`

## Context Sentences Best Practices

Include in Notes field or provide verbally:
- 2-3 additional example sentences
- Different formality levels
- Common collocations
- Set phrases or idioms

Example format in Notes:
```
Created by Claude.

Additional examples:
・毎日単語を覚える。(I memorize vocabulary every day.)
・この単語は難しい。(This word is difficult.)

Common collocations: 単語帳、単語力、英単語
```

## Optional: Uploading Media

If a generated image needs to land in Anki's media folder:

```json
{
  "action": "storeMediaFile",
  "version": 6,
  "params": {
    "filename": "kanji_kangeki.jpeg",
    "data": "<base64-encoded-bytes>"
  }
}
```

Then reference it in the field as `<img src="kanji_kangeki.jpeg">`. Also confirmation-required.
