---
name: design-canvas
description: Designs or redesigns UI with the user on a live browser canvas, iterating on mockups they choose, comment, edit, draw on and tweak, and ends with a build-ready spec and handoff.
argument-hint: "[what to design]"
disable-model-invocation: true
---

# Design canvas

A design session in the user's browser. You draft mockups; the user reacts on the canvas (chooses, comments, edits text, draws, drags tweaks) and presses **Send to AI**; you iterate. Every question goes on the canvas, never split between canvas and terminal. This command is the design process for the session: superpowers brainstorming isn't needed on top of it.

`scripts/` and `references/` below live in this skill's base directory. The markup for every screen is in `references/screen-patterns.md`: follow it.

## Setup

1. **Design system.** If `docs/design/system.md` exists, read it: it's the default for every mockup, so don't ask about it. If the project has UI code but no `system.md`, run Phase 0 first.
2. **References.** Use whatever the request carries: screenshots and sketch photos (read them), URLs (screenshot the page or fetch its markup and CSS), docs, existing screens in the repo. A photographed sketch is a layout to interpret.
3. **Aesthetics.** Load the `frontend-design` skill if it's installed.
4. **Canvas.** Start the server:

   ```bash
   <skill-dir>/scripts/start-server.sh --project-dir <project-root> --open
   ```

   Keep `screen_dir` and `state_dir` from its JSON output, and give the user the full URL including `?key=` in case no browser opened. Add `.design-canvas/` to `.git/info/exclude` unless git already ignores it. If the server can't start (no Node, port in use), say so and continue with questions in the terminal.

## Every round

1. **Status.** First thing each turn, write one line to `state_dir/agent-status`, such as `Reading 3 comments...`. It shows live on the canvas; a new screen clears it.
2. **Goal block.** Every screen starts with the `.dc-goal` block: the session goal in the user's words, why it matters, and the step list with the current step.
3. **Check before pushing.** Fix failures silently and note deliberate exceptions in the panel:
   - only the system's tokens and components, new ones flagged as new
   - body text contrast at least WCAG AA
   - a `data-label` on every meaningful region
   - real content, no lorem ipsum
   - variants that differ in idea, not decoration
4. **Push.** Write a new fragment into `screen_dir` with the Write tool, named for its content (`direction.html`, `layout-v2.html`), never reusing a name. For small fixes that should keep the user's pins, strokes and view, rewrite the same file instead.
5. **Hand over.** Say in a line or two what's on screen and that they press Send to AI when done. Start the waiter in the background and end your turn:

   ```bash
   <skill-dir>/scripts/wait-for-submit.sh <state_dir> <screen-file-name>
   ```

   Exit 0 prints the round's events, 1 is a 30-minute timeout, 2 means the server stopped. If the user answers in the terminal first, use that plus `state_dir/events`.
6. **Read** `state_dir/events` before writing the next screen:
   - notes override clicks
   - apply `edit` events literally
   - write final `tweak` values back as tokens in every later screen
   - answer every `comment` on the next screen with a `.dc-replies` entry; `comment-reply` continues its thread, `comment-resolve` closes it
   - `revert` makes that screen the base; `export` with `format:"handoff"` jumps to Phase 4

Mark the recommended option on every screen with a `recommended-badge`, and give each option a one-line rationale.

If the user goes quiet: when `state_dir/server-stopped` exists, ask in the terminal whether to continue, restart with the same `--project-dir` (port and key persist, so the tab reconnects) and keep the new `screen_dir` and `state_dir`. When the conversation moves to the terminal, push a waiting screen so old choices don't linger.

## Taste

Priority: the project's design system, then the user's stated tone, then these principles.

- **Start from the user's task.** The most important thing on the screen is unmissable and everything else recedes. A mockup that needs explaining needs redesigning.
- **Subtract until it breaks.** Every element earns its place; one good control beats three configurable ones. Include one radically reduced variant.
- **Typography carries the design.** One family, few weights, a real scale, generous whitespace. Build hierarchy from size, weight and spacing, not boxes, borders and tints.
- **Color is information.** A neutral canvas and one accent for the primary action.
- **Obvious over clever.** No mystery navigation, no gesture-only paths, defaults right enough that settings feel unnecessary.
- **Details.** Optical alignment, consistent radii and spacing, real content.

Unless the system or the user asks for them, avoid purple or indigo gradients, emoji as icons, Inter or system-ui as the only typographic idea, the SaaS hero with a three-card grid, cream backgrounds with a serif as shorthand for "editorial", decorative glassmorphism, shadows on everything, and centering everything.

Without a design system, the direction round shows distinct, named type-and-palette pairings, such as "Swiss ledger: Soehne with ink and vermilion", not three shades of one idea. When answers pull toward clutter, push back once with a simpler counter-proposal and say why; if the user still wants it, build it their way.

## Phase 0: system

Only when the repo has UI code but no `docs/design/system.md`. Extract tokens (names and file paths), the type scale and font stacks, spacing and grid rules, radii and shadows, a component inventory (name, path, variants, states), and logos and assets. Push one system preview screen asking "Is this your system?" and, on send, write `docs/design/system.md` in the format from the patterns reference. From then on, grounding in the system is silent: ask "diverge from the system?" only when the request implies it.

## Phase 1: goal, then draft

The first screen of every session is the goal screen. The goal sets the fidelity ceiling, the decision tree and the handoff:

| Goal | Fidelity | Decision tree | Result |
|---|---|---|---|
| `prototype`: realistic click paths | styled to high | flow, layout, typography, color, states | Clickable high-fidelity prototype; handoff adds a click-path map |
| `look`: rough look | wireframe to styled | direction, layout, typography, color | Styled screens, no interaction-state detail |
| `wireframe`: wireframes only | wireframe throughout | direction, layout, content hierarchy | Grey-box wireframes; spec covers structure only |

Put the chosen goal in the goal block's why line. A later note can change the goal; adjust the remaining steps to match.

Infer the rest from the request, the repo and the references: variant count (default 3), viewport, theme, scope, depth (default quick). Ask in the terminal only what would change the first draft, at most three questions and usually none. Round 1 is a real board of drafts at the goal's starting fidelity, with its assumptions listed in the panel ("Desktop, 3 variants, faithful to system, light theme. Comment to change"). For an empty request in a new project, add the intake groups to the goal screen. When the direction is wide open, make round 1 a wide round of 6 to 10 rough artboards.

## Phase 2: iterate

Walk the goal's decision tree in dependency order, only through the forks that matter.

- **One material fork per round.** Decide the minor branches yourself and list them under "Also decided, comment to change". Quick depth is about five rounds; full depth covers every branch, only when the user asks.
- **Fidelity rises by phase,** up to the goal's ceiling: wireframes for direction and layout, styled for type, color and density, high fidelity at convergence.
- **Prototype goal.** From round 1, every artboard is a working flow, its primary path wired with inline handlers that swap views inside the artboard body. From the layout round on, add real content and the empty, loading and error states the path hits. Say in the panel which path to try with Play.
- **Structure versus values.** Structural forks (which layout, which direction) are artboards to choose from. Continuous values (spacing, radius, accent, type scale, density) go in a tweaks panel bound to CSS custom properties, never A/B screens. After "Apply everywhere", write the values back as tokens in every later screen.
- **Remixes are first class.** "B's layout with D's header" means build the hybrid, and label where its parts came from.
- **Build on earlier answers.** From mid-session on, variants refine the winning direction.
- **Branching.** On "try something completely different", or after the user rejects every variant twice: copy the current winner to `.design-canvas/snapshots/<name>.html` with a comment listing the decisions so far, say where it went, restart at direction, and show the snapshot beside the new branch before converging.
- **Answer from the codebase** whenever a branch can be resolved there (existing tokens, established patterns).
- **Modes.** Head-to-head and three-way rounds use the canvas board, one evolving design uses single-design iteration, non-visual forks use concept cards. Use `data-viewport` whenever the viewport matters.

## Phase 3: convergence

Push the convergence screen: the assembled design at the goal's ceiling fidelity (clickable for `prototype`), a list of decisions with each answer's why (including the "Also decided" items), and Approve or Something's off. Something's off loops back into Phase 2 on the flagged branch; Approve sends in one click.

## Phase 4: output and handoff

On approval, or a `handoff` export, write `docs/design/YYYY-MM-DD-<topic>/` with three files:

- `spec.md`: direction, palette, type scale and layout decisions, each with the why from the user's answers. Use token names; give raw values only for new tokens, flagged `NEW`.
- `mockup.html`: the final design as a self-contained page, with its own doctype and head and the final tweak values inlined as `:root` variables.
- `handoff.md`, for the implementing session:
  1. the component tree, each node mapped to an existing component path or marked `NEW`
  2. tokens used, by name
  3. layout hierarchy and responsive behaviour per viewport
  4. interaction states: hover, focus, empty, loading, error
  5. assets
  6. rejected alternatives and why
  7. open questions
  8. for `prototype` only, the click-path map: screen, action, next screen
  9. a ready-to-paste "Implement this" prompt pointing at the three files and the target source paths

Then push a final waiting screen naming where the files went, stop the server with `<skill-dir>/scripts/stop-server.sh <session-dir>` (the parent of `screen_dir` and `state_dir`), and ask in the terminal whether to implement it now.

Screens under `.design-canvas/` are scratch; `docs/design/` is the deliverable.
