# Screen patterns

Screens are HTML fragments written to `screen_dir`. The server wraps each one in the canvas frame, which provides the theme, the toolbar, the conversation column, the composer and all event wiring. Write a full document (`<!DOCTYPE html>`) only to leave the frame entirely. A new round always gets a new file name (`-v2`, `-v3`); rewriting the same file updates the screen in place and keeps the user's pins, strokes, view and tweak values.

The frame already provides these, so never build them:

- the **composer** in the left column, whose text arrives as `note` events
- **Send to AI**, which sends a `submit` event and ends the user's turn
- the **Comment, Edit, Draw and Tweak** tools, **History**, **Export** and the status chip
- the **question card**: a `.board-panel` anywhere in the fragment becomes the card at the end of the conversation column. Its `<h3>` joins the thread once the next screen arrives.

Mark the recommended option in every choice group with `<span class="recommended-badge">Recommended</span>` inside that option's `<h3>` or artboard title.

## Goal block

The first element of every screen:

```html
<div class="dc-goal" data-step="3" data-steps="Direction|Header layout|Row density|Type and color|Final review">
  <h1>Redesign the roadmap header</h1>
  <p>So the date range and item count read at a glance.</p>
</div>
```

The frame moves it into the column header: goal, why, "Now: Row density" with "Step 3 of 5", and a segmented progress bar. It also sets the tab title. `data-steps` lists the decision tree being walked and `data-step` counts from 1. Keep the goal stable for the whole session; a screen without the block reuses the last one, but include it anyway.

## Panel content

Inside `.board-panel`:

```html
<div class="board-panel">
  <h3>Which layout for the dashboard?</h3>
  <p class="subtitle">A is my pick: the primary action is unmissable.</p>

  <!-- round 1 -->
  <div class="label">Assumptions</div>
  <ul style="font-size:.8rem;margin-left:1rem;line-height:1.7">
    <li>Desktop, 3 variants, faithful to system, light theme</li>
  </ul>

  <!-- later rounds -->
  <div class="label">Also decided, comment to change</div>
  <ul style="font-size:.8rem;margin-left:1rem;line-height:1.7">
    <li>Card radius follows <code>--radius-md</code></li>
  </ul>

  <!-- Replies to last round's comments. Hidden here, shown in the comment
       list and on the pins. data-comment is the pin number. -->
  <ul class="dc-replies">
    <li data-comment="3">Thinned the header to 500 weight</li>
  </ul>
</div>
```

## Goal screen (`goal.html`)

The first screen of every session: one `goal:` group, with the recommendation picked from the request. A flow or "how does a user get from X to Y" suggests `prototype`; "make it look better" or a restyle suggests `look`; a new feature or early idea suggests `wireframe`. Prefix each group's `data-choice` values with its name. `toggleSelect` keeps one selection per `.options` container.

```html
<h2>What is the goal of this session?</h2>
<p class="subtitle">This sets how far I take the fidelity and what I hand off. My recommendation is marked; the composer takes anything else.</p>

<div class="section">
  <div class="label">Goal</div>
  <div class="options">
    <div class="option" data-choice="goal:prototype" onclick="toggleSelect(this)">
      <div class="letter">A</div>
      <div class="content"><h3>Realistic click paths</h3><p>A clickable prototype: connected screens, working buttons, real content. Try it with Play.</p></div>
    </div>
    <div class="option" data-choice="goal:look" onclick="toggleSelect(this)">
      <div class="letter">B</div>
      <div class="content"><h3>Rough look <span class="recommended-badge">Recommended</span></h3><p>The visual direction: type, color, layout feel. Static screens, no wiring.</p></div>
    </div>
    <div class="option" data-choice="goal:wireframe" onclick="toggleSelect(this)">
      <div class="letter">C</div>
      <div class="content"><h3>Wireframes only</h3><p>Structure and hierarchy in grey boxes. No styling decisions.</p></div>
    </div>
  </div>
</div>
```

For an empty request in a new project, add these groups to the same screen under `<h2>Before I draft</h2>`:

```html
<div class="section">
  <div class="label">What are we designing?</div>
  <div class="options">
    <div class="option" data-choice="scope:screen" onclick="toggleSelect(this)">
      <div class="letter">A</div>
      <div class="content"><h3>A screen <span class="recommended-badge">Recommended</span></h3><p>One page or view.</p></div>
    </div>
    <div class="option" data-choice="scope:component" onclick="toggleSelect(this)">
      <div class="letter">B</div>
      <div class="content"><h3>A component</h3><p>One reusable piece, in its states.</p></div>
    </div>
    <div class="option" data-choice="scope:flow" onclick="toggleSelect(this)">
      <div class="letter">C</div>
      <div class="content"><h3>A short flow</h3><p>2 to 4 connected screens.</p></div>
    </div>
  </div>
</div>

<div class="section">
  <div class="label">Competing designs per round</div>
  <div class="options">
    <div class="option" data-choice="mode:1" onclick="toggleSelect(this)">
      <div class="letter">1</div><div class="content"><h3>One evolving design</h3><p>Refined round by round.</p></div>
    </div>
    <div class="option" data-choice="mode:3" onclick="toggleSelect(this)">
      <div class="letter">3</div><div class="content"><h3>Three-way <span class="recommended-badge">Recommended</span></h3><p>The widest spread, fastest to a direction.</p></div>
    </div>
    <div class="option" data-choice="mode:wide" onclick="toggleSelect(this)">
      <div class="letter">W</div><div class="content"><h3>Go wide first</h3><p>6 to 10 rough options, then remix the best.</p></div>
    </div>
  </div>
</div>

<div class="section">
  <div class="label">Depth</div>
  <div class="options">
    <div class="option" data-choice="depth:quick" onclick="toggleSelect(this)">
      <div class="letter">A</div><div class="content"><h3>Quick <span class="recommended-badge">Recommended</span></h3><p>About 5 rounds; I decide the small things and list them.</p></div>
    </div>
    <div class="option" data-choice="depth:full" onclick="toggleSelect(this)">
      <div class="letter">B</div><div class="content"><h3>Full</h3><p>Every branch, one per round.</p></div>
    </div>
  </div>
</div>
```

A multi-select group adds `data-multiselect` to its `.options` container.

## System preview (`system.html`)

Phase 0: one board with one wide artboard showing what you extracted. The panel asks "Is this your design system?" and lists anything you were unsure of.

```html
<div class="board">
  <div class="board-panel">
    <h3>Is this your design system?</h3>
    <p class="subtitle">Pulled from <code>src/styles/tokens.css</code> and 14 components. Comment on anything wrong; Send when it's right.</p>
  </div>
  <div class="board-surface">
    <div class="artboard" style="width:960px">
      <div class="artboard-title">System</div>
      <div class="artboard-body">
        <section data-label="Type scale"><!-- each step rendered with its token name --></section>
        <section data-label="Palette"><!-- swatches with token name and value --></section>
        <section data-label="Components"><!-- buttons, cards, inputs in their variants and states --></section>
      </div>
    </div>
  </div>
</div>
```

`docs/design/system.md` format:

```markdown
# Design system: <project>
Sources: <paths>
## Tokens
| Token | Value | Use |
## Type
Families, scale steps (token, size, line height, weight)
## Spacing and grid
## Radii, shadows, motion
## Components
| Component | Path | Variants | States |
## Assets
Logos, icon set, illustration style
## Notes
Patterns and conventions worth keeping
```

## Concept cards

For non-visual forks such as tone words or scope: one `.options` group and one question per screen, with the same markup as a goal-screen group and a one-line rationale per option.

## Canvas board

The default for showing designs: variants side by side as artboards on a pannable, zoomable board. Style mockup internals with inline styles so nothing leaks into the frame. From styled fidelity on, use real content, real type stacks (a Google Fonts `<link>` is fine) and real palette values.

```html
<div class="board">
  <div class="board-panel">
    <h3>Which direction for the header?</h3>
    <p class="subtitle">A is my pick: the strongest hierarchy at dashboard density.</p>
  </div>
  <div class="board-surface">
    <div class="artboard" data-choice="header-a" data-viewport="desktop" onclick="toggleSelect(this)">
      <div class="artboard-title">A: Compact bar <span class="recommended-badge">Recommended</span></div>
      <div class="artboard-body" data-label="Variant A">
        <!-- data-label each meaningful region ("Header", "Nav", ...) so
             comments, edits and strokes come back in plain words -->
      </div>
    </div>
    <div class="artboard" data-choice="header-b" data-viewport="desktop" onclick="toggleSelect(this)">
      <div class="artboard-title">B: Split masthead</div>
      <div class="artboard-body" data-label="Variant B"><!-- variant B --></div>
    </div>
  </div>
</div>
```

- **Structure.** `.board` is the fragment's only top-level element; a `.tweaks` block may sit inside it.
- **Size and position.** Size artboards with `data-viewport="mobile|tablet|desktop"` (390, 834 or 1280 px, shown in the title) or an inline `width`. Without `left` and `top` they flow in rows of up to four and fit to the screen; set them only for deliberate arrangements, such as a flow laid out left to right.
- **Count.** One, two or three artboards, per the session's mode. A wide round uses 6 to 10 quick wireframe artboards lettered A to J, so remix notes are easy. A hybrid names its sources in the title: `A's layout + D's header`.
- **Play.** The frame adds Choose to every artboard title, and Play to artboards whose body has inline handlers (`onclick`, `oninput`, ...) or native controls (`details`, `input`, `select`). Play lets the user try real interactions: wire them with inline handlers inside the artboard body. Add `data-playable` when the interactions come from elsewhere, such as CSS-only hover. For `prototype`, put every screen of the flow in one artboard body as sibling `data-label` views, only one visible, switched by the buttons' handlers.
- **Labels.** `data-label` on every meaningful region.
- **Variants** differ in idea, not decoration. Include one radically reduced variant.

## Tweaks

For continuous decisions. Put a `.tweaks` block in the fragment: the frame turns it into a floating card where every input changes a CSS custom property live, without a round trip. Use the variables in the mockup's inline styles, always with a fallback.

```html
<div class="tweaks" data-target="#frame-content">
  <label>Spacing <input type="range" data-tweak="--gap" data-unit="px" min="4" max="48" step="2" value="16"></label>
  <label>Corner radius <input type="range" data-tweak="--radius" data-unit="px" min="0" max="24" value="8"></label>
  <label>Accent <input type="color" data-tweak="--accent-x" value="#2f6f4e"></label>
  <label>Type scale
    <select data-tweak="--scale"><option value="1.2">Minor third</option><option value="1.25" selected>Major third</option><option value="1.333">Perfect fourth</option></select>
  </label>
</div>
<!-- in mockups: style="gap:var(--gap,16px); border-radius:var(--radius,8px)" -->
```

- `data-target` scopes the variables with a selector, by default the whole screen. Use `.artboard[data-choice="a"]` to scope them to one variant.
- The user drags, then presses **Apply everywhere**, which sends a `tweak` with `final:true` plus a submit. Bake those values into every later screen and into the spec as tokens.
- Name variables after the design decision rather than the CSS property where possible: `--density`, `--accent`.

## Single-design iteration

For `mode:1` rounds: one artboard, with the round's question in the panel.

```html
<div class="board">
  <div class="board-panel">
    <h3>Round 3: density</h3>
    <p class="subtitle">Drag the tweaks to taste, or pick a preset.</p>
    <div class="options">
      <div class="option" data-choice="keep" onclick="toggleSelect(this)">
        <div class="letter">A</div>
        <div class="content"><h3>Keep as is <span class="recommended-badge">Recommended</span></h3><p>Rationale.</p></div>
      </div>
      <div class="option" data-choice="denser" onclick="toggleSelect(this)">
        <div class="letter">B</div>
        <div class="content"><h3>Try denser</h3><p>Rationale.</p></div>
      </div>
    </div>
  </div>
  <div class="board-surface">
    <div class="artboard" data-viewport="desktop">
      <div class="artboard-title">Current design, v3</div>
      <div class="artboard-body" data-label="Design v3"><!-- the evolving mockup --></div>
    </div>
  </div>
</div>
```

The single artboard has no `data-choice` or `onclick`: the answer comes from the panel, a tweak, an edit or a comment.

## Convergence (`final.html`)

The assembled high-fidelity design as one artboard, with the decisions and the approval in the panel. `data-submit` sends on click.

```html
<div class="board">
  <div class="board-panel">
    <h3>The design</h3>
    <p class="subtitle">Everything you chose, assembled. Approve, or pin comments and edit text on whatever still bothers you.</p>
    <div class="label">Decisions</div>
    <ul style="font-size:.85rem; line-height:1.8; margin-left:1.25rem;">
      <li><strong>Direction:</strong> ... because ...</li>
      <!-- one item per resolved branch, including the "also decided" ones -->
    </ul>
    <div class="options" style="margin-top:1rem;">
      <div class="option" data-choice="approve" data-submit onclick="toggleSelect(this)">
        <div class="letter">A</div>
        <div class="content"><h3>Approve</h3><p>Write the spec, mockup and handoff.</p></div>
      </div>
      <div class="option" data-choice="flag" onclick="toggleSelect(this)">
        <div class="letter">B</div>
        <div class="content"><h3>Something's off</h3><p>Select this, pin a comment on the part, then Send.</p></div>
      </div>
    </div>
  </div>
  <div class="board-surface">
    <div class="artboard" data-viewport="desktop">
      <div class="artboard-title">Final design</div>
      <div class="artboard-body" data-label="Final design"><!-- high-fidelity design --></div>
    </div>
    <!-- add a mobile artboard when the design is responsive -->
  </div>
</div>
```

## Waiting (`waiting.html`, `waiting-2.html`, ...)

```html
<div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
  <p class="subtitle">Continuing in the terminal...</p>
</div>
```

## Status

At the start of each turn, write one line to `state_dir/agent-status`. It appears as a live chip on the canvas and lands in the conversation column. A new screen clears it.

```bash
echo "Applying your 4 comments to layout B..." > <state_dir>/agent-status
```

## Reading answers

`state_dir/events` holds one JSON object per line for the current screen, each with `screen` (the file it came from) and `timestamp`. Pushing a new screen moves the file to `state_dir/history/events-<ts>.jsonl`, so look there if you pushed before reading. `wait-for-submit.sh` prints the file once the user sends.

- `{"type":"submit","selections":["header-a"],"count":4}`: the user pressed Send to AI. `selections` is everything currently selected; treat all events before it as one batch.
- `{"type":"click","choice":"mode:3","text":"..."}`: the last click per group is the selection; earlier clicks in the same group show hesitation worth a follow-up. For multi-select groups, replay the whole sequence (an odd count means selected).
- `{"type":"choice","choice":"...","value":"..."}`: from `window.designCanvas.choice()` in custom screens.
- `{"type":"note","text":"..."}`: composer input. Notes override clicks. A remix note ("B with D's header") means build the hybrid.
- `{"type":"comment","n":3,"target":{"artboard":"header-a","label":"Header","path":"div > h1","text":"Roadmap"},"text":"too heavy"}`: a pin on a specific part. Pin numbers are unique for the whole session. Address every comment and reply with a `.dc-replies` item (`data-comment="3"`) on the next screen.
- `{"type":"comment-delete","n":3}`: ignore comment 3.
- `{"type":"comment-reply","n":3,"text":"maybe 600 instead?"}`: a reply in comment 3's thread. Treat it as an amendment and reply again through `.dc-replies`.
- `{"type":"comment-resolve","n":3}`: comment 3 is closed. Leave that part alone unless asked.
- `{"type":"edit","n":1,"target":{...},"before":"Three items due this week.","after":"Two items due today."}`: a direct text edit. Apply it literally in every later screen and in the spec.
- `{"type":"edit-undo","n":1}`: discard edit 1.
- `{"type":"tweak","vars":{"--gap":"24px","--accent-x":"#2f6f4e"},"final":false}`: live tweak values; only the latest counts, and `final:true` means "Apply everywhere".
- `{"type":"draw","n":2,"shape":"enclosure","target":{"artboard":"header-a","labels":["Header","Nav"]},"bbox":{...},"points":[[x,y],...]}`: a freehand stroke. An enclosure means focus here, an underline means emphasis, a freehand shape is a sketch to interpret. `points` use surface pixels, the same space as artboard `left` and `top`. Pair strokes with the note or comment that follows them.
- `{"type":"draw-undo","n":2}`: discard stroke 2.
- `{"type":"revert","to":"layout-v2.html"}`: the user reopened an earlier screen from History and chose "Bring this back". Use it as the base for the next round.
- `{"type":"export","format":"handoff","artboard":"header-a"}`: the user wants the handoff now. Go to Phase 4, using that artboard if one is named.
- No file and no submit: the user didn't touch the browser; use their terminal reply.
