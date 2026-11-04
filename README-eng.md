# Circuit Simulation

[ภาษาไทย](README.md) · **English**

An interactive circuit simulator on a **20 × 20 node board**. Drag and drop components, wire them up, and watch current, voltage, heat and energy in real time. It runs in any modern browser, with nothing to install.

It was built to explain electrical physics problems visually (for example Thai PAT3 exam questions), not just to recite formulas.

## Getting started

Open `index.html` in a browser (keep `style.css`, `app.js` and `knowledge.js` in the same folder). An internet connection is needed to load the fonts. If you enable GitHub Pages for this repository, the simulator can be used straight from a link.

## Features

- **20 × 20 node board.** Drag components onto the board, and drag from one node to another to draw a wire.
- **Real physics, every fraction of a second.** The solver applies Kirchhoff's laws, so you see real behaviour: capacitors charging gradually, inductor current ramping up, diodes cutting an AC wave in half.
- **Current direction or electron flow.** Switch the animation to see which way charge actually moves.
- **Ideal or real circuit.** Ideal mode has sources with no internal resistance; ammeters, switches and fuses with no resistance at all (a branch they short carries exactly 0 A); voltmeters that draw no current; and diodes that act as perfect one-way switches with no voltage drop. Real mode adds internal resistance and component ratings.
- **Heat and energy.** Components heat up with the power they dissipate, and a summary shows energy supplied, energy turned into heat, and energy stored.
- **Burnout and explosions** (real mode). Exceed a rating and a component burns out, explodes or melts. Each part breaks into its own debris (glass shards from a bulb, a flying lid and foil strips from a capacitor, acid splashes from a battery), with a fireball, shockwave, electric arcs and a scorch mark left on the board. A fuse can cut the circuit first.
- **Oscilloscope.** Plot voltage and current of the selected component over time.
- **Text circuit code.** Import and export circuits as plain text, so an AI assistant can write a circuit from a problem statement and you paste it in to build it instantly.
- **Saved circuits** in the browser, with undo (Ctrl+Z) and redo (Ctrl+Y).
- **Sound.** A click sound on every click, and a notification sound when current starts to flow in the circuit (again whenever it flows after the circuit has gone quiet). The "Sound" switch in the menu turns it off.
- **Menu (top left, three lines).** A "Components" page explains all 15 parts (symbol, what it does, how it behaves, formulas, settings, ideal and real mode, what to watch out for, and a basic circuit running live on the page). A "Circuits" page explains the basic ideas (nodes, short circuits, KCL, KVL and more) and 13 example circuits, and a "Circuit plans" page holds ready-made and saved circuits. "Try it on the board" opens that circuit on the main board.
- **Step-by-step lessons.** Every circuit and idea in the menu is a lesson: meet the circuit (the board lights up each part and says what it does) → watch the current (paths with current glow, the rest goes dark, with a slow-motion button) → why it works (with an everyday comparison) → read the meters (live numbers, with the peak for AC) → guess first (the board pauses and hides its meters until you answer; a wrong answer gets a hint) → your turn. Tap a part on the small board to see what it does, or tap a switch to flip it. The left and right arrow keys change steps.
- **Game modes** (menu item 04), played on a board of their own: 6 modes and 27 levels. Solve it! (limited parts: make it work), King of hill (the same plan with fewer wires and parts), Rush (bulbs that light only at the right current, or need a higher voltage), and the tier-two modes that open once their partner is complete: Solve it + (against the clock), Zero day (the best plan, with extra conditions) and Chase! (find what is missing or broken with the meters, then fix it). Each level earns 1 to 3 stars and has a hint and an answer; the browser remembers your progress.
- **Circuit plans.** The "Ready-made" tab has 35 circuits in 9 topics (DC, series and parallel, meters, switches, capacitors and inductors, AC, diodes and LEDs, transformers, real mode). The "Mine" tab lists the circuits you saved: save the board from there, watch a saved circuit run, open it on the main board, or delete it. A plan also opens from a link, for example `index.html#bridge_smooth`.
- **Thai or English.** Thai is the default; choose English in the menu and every text on the page switches. The browser remembers the choice.
- **Works on phones and tablets.** The whole board fits on the first screen, with the toolbar above it, the component palette beside it (fold it away with the side-panel button), and the controls and readouts below. On phones the effects are lightened automatically so it stays smooth.

## Components

| Component | Notes |
|---|---|
| DC source | Positive terminal is leg b |
| AC source | Set peak voltage and frequency |
| Resistor | Adjustable R and power rating |
| Bulb | Brightness follows P = I²R |
| Switch | Click to open or close |
| Fuse | Blows when current exceeds its rating |
| Capacitor | Value in microfarads (µF) |
| Inductor | Value in henries (H) |
| Transformer | A primary coil (`TP`) and a secondary coil (`TS`) paired by a group number, with a turns ratio n. Ideal mode gives an ideal transformer (V₂ = n·V₁); real mode gives coupled coils with settable L and coupling k. AC only |
| Ground | A 0 V reference point. The potential φ shown when you point at the board is measured from it. Optional; the board picks a reference itself without one |
| Diode / LED | Conducts from leg a to leg b. An LED comes in six colours (red, orange, yellow, green, blue, white) with a colour-dependent drop of about 2 V to 3.1 V |
| Voltmeter | Connect in parallel, reads V(a) − V(b) |
| Ammeter | Connect in series, reads current from a to b |

## Toolbar

Press the keys 1 to 5 to switch tools.

| Key | Tool | What it does |
|---|---|---|
| 1 | Smart (default) | Drag between nodes to wire, drag a component to move it, click to select, click a switch to toggle it |
| 2 | Select | Click a node or component to edit its values, disable it, or delete it |
| 3 | Rotate | Click a component to rotate it 90° clockwise |
| 4 | Delete | Click a node to delete everything connected there |
| 5 | Idle | Clicks do nothing |

"Disable" keeps a component or wire on the board but takes it out of the circuit.

Other shortcuts (press ? or the ? button on the toolbar to see them all):

| Key | What it does |
|---|---|
| Drag a box (select tool) / Shift+drag | Select several things, then drag any of them to move the group |
| Shift+click, Ctrl+A | Add to or remove from the group, select everything |
| Ctrl+C / Ctrl+V / Ctrl+D | Copy / paste / duplicate (new numbers; a transformer keeps its own pair) |
| Ctrl+Z / Ctrl+Y | Undo / redo |
| R, Delete | Rotate, delete the selection (a whole group too) |
| ↑ / ↓ or the mouse wheel | Step the main value of the selected part (R, C, L in 1-2-5 steps, EMF by 1 V, LED colour) |
| Shift+arrows | Move the selection one cell |
| Space | Pause / resume |

## Circuit code (CIRCUIT v1)

Each line is one component or one wire. Coordinates are `x,y` from 0 to 19 (x goes right, y goes down).

```
CIRCUIT v1 ideal=1
TITLE Flashlight
DC  3,9 3,7  E=9
B   8,7 8,9  R=20
W   3,7 3,3 8,3 8,7
W   3,9 3,13 8,13 8,9
```

Click **"โค้ดวงจร"** (Circuit code) to open a popup. It has a ready-made English prompt: copy it into an AI chat together with a photo of the problem, paste the code the AI returns into the code box, then click **"นำเข้าวงจร"** (Import) to build the circuit on the board.

The full format guide (component table, wiring rules, common mistakes, worked examples) is in [`docs/circuit-code-spec.md`](docs/circuit-code-spec.md). It is written in Thai. Attach it to an AI assistant so it can write correct circuit code from a problem.

Key rules to remember:

- Every component has two legs, exactly 2 grid steps apart, horizontal or vertical.
- A wire connects to every grid point it passes through, and crossing wires on a grid point are always connected.
- Capacitance is in µF, and the AC source value is the **peak** voltage, not rms.

## Limitations

There are no variable resistors, transistors, op-amps or current sources yet. The speed of the dots moving along wires is scaled so you can see it, and is not the real drift speed of electrons.

## Version

The version number has four parts, `major.medium.minor.patch`, for example `1.0.2.0` (major = a new system or more than 5 new sub-systems, medium = 2–5 new sub-systems, minor = exactly 1 new sub-system, patch = style, text or other small changes) and is shown at the bottom of the page. The change log is a file named after the version, for example `version 1.0.2.1.txt` (click the version on the page to open it). A release that is not yet certain carries a tag after the number: `1.0.3.0 alpha` (experimental, up to 30% bugs) or `1.0.3.0 beta` (nearly final, up to 5% bugs).

## Tech

Plain HTML, CSS and JavaScript split into `index.html` (page structure), `style.css` (styles), `app.js` (program) and `knowledge.js` (the explanations of parts and circuits, in Thai and English), with no build step and no external libraries (apart from Google Fonts). The circuit solver uses Modified Nodal Analysis, backward Euler companion models for capacitors and inductors, and Newton-Raphson iteration for diodes and LEDs. The interface is in Thai or English.
