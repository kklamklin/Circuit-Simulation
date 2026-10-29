# Circuit Simulation

[ภาษาไทย](README.md) · **English**

An interactive circuit simulator on a **20 × 20 node board**. Drag and drop components, wire them up, and watch current, voltage, heat and energy in real time. It is a single HTML file that runs in any modern browser, with nothing to install.

It was built to explain electrical physics problems visually (for example Thai PAT3 exam questions), not just to recite formulas.

## Getting started

Open `index.html` in a browser. An internet connection is needed to load the fonts. If you enable GitHub Pages for this repository, the simulator can be used straight from a link.

## Features

- **20 × 20 node board.** Drag components onto the board, and drag from one node to another to draw a wire.
- **Real physics, every fraction of a second.** The solver applies Kirchhoff's laws, so you see real behaviour: capacitors charging gradually, inductor current ramping up, diodes cutting an AC wave in half.
- **Current direction or electron flow.** Switch the animation to see which way charge actually moves.
- **Ideal or real circuit.** Ideal mode has sources with no internal resistance, ideal meters and diodes with no voltage drop. Real mode adds internal resistance and component ratings.
- **Heat and energy.** Components heat up with the power they dissipate, and a summary shows energy supplied, energy turned into heat, and energy stored.
- **Burnout and explosions** (real mode). Exceed a rating and a component burns out, explodes or melts. A fuse can cut the circuit first.
- **Oscilloscope.** Plot voltage and current of the selected component over time.
- **Text circuit code.** Import and export circuits as plain text, so an AI assistant can write a circuit from a problem statement and you paste it in to build it instantly.
- **Saved circuits** in the browser, and undo with Ctrl+Z.

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
| Diode / LED | Conducts from leg a to leg b |
| Voltmeter | Connect in parallel, reads V(a) − V(b) |
| Ammeter | Connect in series, reads current from a to b |

## Toolbar

Press the keys 1 to 5 to switch tools.

| Key | Tool | What it does |
|---|---|---|
| 1 | Smart (default) | Drag between nodes to wire, drag a component to move it, click to select, click a switch to toggle it |
| 2 | Select | Click a node or component to edit its values, pause it, or delete it |
| 3 | Rotate | Click a component to rotate it 90° clockwise |
| 4 | Delete | Click a node to delete everything connected there |
| 5 | Idle | Clicks do nothing |

"Pause" keeps a component or wire on the board but takes it out of the circuit.

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

Click **"โค้ดวงจร"** (Circuit code), paste the code, then click **"นำเข้าวงจร"** (Import) to build the circuit on the board.

The full format guide (component table, wiring rules, common mistakes, worked examples) is in [`docs/circuit-code-spec.md`](docs/circuit-code-spec.md). It is written in Thai. Attach it to an AI assistant so it can write correct circuit code from a problem.

Key rules to remember:

- Every component has two legs, exactly 2 grid steps apart, horizontal or vertical.
- A wire connects to every grid point it passes through, and crossing wires on a grid point are always connected.
- Capacitance is in µF, and the AC source value is the **peak** voltage, not rms.

## Limitations

There are no variable resistors, transformers, transistors, op-amps or current sources yet. The speed of the dots moving along wires is scaled so you can see it, and is not the real drift speed of electrons.

## Tech

Plain HTML, CSS and JavaScript in one file, with no external libraries (apart from Google Fonts). The circuit solver uses Modified Nodal Analysis, backward Euler companion models for capacitors and inductors, and Newton-Raphson iteration for diodes and LEDs. The interface is in Thai.
