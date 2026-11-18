# Row Power Compare

**Compare 480 V AC, 415 V AC and 800 V DC for one row of AI racks, and see what each choice costs over time.**

Free beta · Sized to the 2023 National Electrical Code · Works in any browser, on a computer or a phone

**▶ Use it:** [alesha234.github.io/row-power-compare](https://alesha234.github.io/row-power-compare/)

---

## Why it exists

AI racks draw 100 kW or more each, so the way a data hall is fed matters more than ever. Engineers and developers keep asking the same early question: *should this row run on 480 V AC, 415 V AC or 800 V DC?*

Answering it usually means a spreadsheet, a code book and an afternoon. Row Power Compare answers it in seconds, side by side, and shows its work. Every number traces to an input you can change or to the code table it came from.

## Who it's for

- **Electrical engineers** doing an early comparison before anyone draws a one-line diagram.
- **Data center developers and colocation teams** weighing power architectures for AI halls.
- **Anyone learning** how voltage, wire size, losses and cost connect.

## What it compares

Three ways to feed a row, each either **with a run per rack** or **with one shared row feeder**:

| Option | Conversion stages modeled |
|---|---|
| 480 V AC | Medium-voltage transformer → UPS → rack power shelf |
| 415 V AC | Medium-voltage transformer → UPS → rack power shelf |
| 800 V DC | Solid-state transformer → 800 V to rack converter |

For each option it shows:

- **Sizing:** current, wire size and parallel sets, breaker, ground wire, and a busway rating for a shared feeder
- **Metal:** copper or aluminum weight and metal cost
- **Performance:** voltage drop at full load and wire heat at average load
- **Losses:** conversion loss and its efficiency
- **Money:** the cost of losses per year and over your chosen period, and the total of losses plus metal
- **A clear answer:** a "Lowest total" badge, one line explaining why that option wins, and whole-hall totals

A red warning appears when voltage drop is over 3%. That figure is guidance from the code's Informational Notes, not a code limit.

## How to use it

1. **Describe your row:** hall IT load, rack load, racks per row, run length, average load, power factor, conductor, ambient temperature, electricity price, PUE, years and metal price. Every field starts at a sensible default.
2. **Choose how the row is fed:** a run per rack, or one shared row feeder.
3. **Adjust the conversion efficiencies** if you know your equipment (under "Conversion efficiencies").
4. **Read the answer:** the winning option is outlined in green, with the reason underneath.
5. **Share or keep it:**
   - **Copy link** creates a link with every input in it, so anyone who opens it sees the same comparison.
   - **Save on this device** keeps it in your browser only.

## Method and sources

Every sizing rule comes from the 2023 National Electrical Code (NEC):

| Rule | Source |
|---|---|
| Size each feeder at 125% of continuous load | NEC 215.2(A)(1) |
| Wire ampacity from the 75 °C column, checked against the 90 °C rating after ambient correction | NEC Table 310.16 and Table 310.15(B)(1)(1) |
| Breaker: the next standard rating | NEC 240.6(A) |
| Above 500 kcmil, use parallel sets | NEC 310.10(G) |
| Grounding conductor (per parallel set) | NEC Table 250.122 |
| Conductor resistance at 75 °C and conductor area | NEC Chapter 9, Table 8 |
| Voltage drop guidance: 3% feeder, 5% total | NEC Informational Notes (guidance, not a limit) |

Losses and cost:

- **Wire heat** = current² × resistance, on current-carrying conductors only, at your average load. At 60% load that's 36% of the full-load heat.
- **Conversion loss** = the IT load at your average load, divided by the chain's combined efficiency, minus the IT load.
- **Cooling** for the waste heat = (PUE − 1) × the heat, so wasted energy is charged at heat × PUE.
- **Cost of losses** = wasted energy × 8,760 hours a year × your electricity price.
- **Metal weight** uses standard densities: copper 8.89 g/cm³, aluminum 2.70 g/cm³.

All the rules live in one file, [`calc.js`](calc.js), with each table labeled by its NEC number.

## Built-in checks

The calculator checks itself every time it opens. **If any check fails, it shows no results at all**, never a wrong number.

| Case (worked by hand) | Expected result |
|---|---|
| 100 A continuous, copper | 1 AWG, 125 A breaker, 6 AWG ground |
| 100 A continuous, aluminum | 2/0 |
| 100 A continuous + 100 A non-continuous | 4/0, 225 A breaker |
| 100 kW rack at 480 V AC, power factor 0.95 | 126.6 A, 2/0, 175 A breaker, 6 AWG ground |
| 1,250 A at 800 V DC | 5 parallel sets of 400 kcmil, 1,600 A breaker, 4/0 ground per set |
| 50 MW hall, defaults, a run per rack | 57.5 t (480 V AC), 71.8 t (415 V AC), 30.1 t (800 V DC) of copper, within 1% |

Run them yourself with Node.js:

```bash
node -e 'console.log(require("./calc.js").selfCheck())'
```

An empty list (`[]`) means every check passed.

## What it simplifies

Listed so nobody mistakes a simplification for a code requirement:

1. Every load is treated as continuous.
2. Resistance is DC resistance at 75 °C. AC skin effect and reactance are ignored.
3. Each per-rack run, or each parallel set, is in its own raceway with at most three current-carrying conductors, so no bundling adjustment applies. The neutral isn't counted as current-carrying.
4. Both AC options use the same conversion chain. Its efficiencies are inputs you can change.
5. Conversion efficiencies are typical published figures, not measurements of any product. The 800 V to rack converter figure (98%) is not yet confirmed.
6. A busway for a shared feeder is sized by rating only. Its copper, resistance and losses depend on the manufacturer and aren't estimated.

## Your data

There's no sign-in and nothing to install. Your inputs never leave your browser. "Save on this device" stores comparisons in your own browser only, and "Copy link" puts the inputs in the link itself.

## Found something off, or want a second look?

Use **"Something looks off?"** under the results to tell me what looks wrong, or **"Request a 15-minute check"** to talk through your project. Both open my LinkedIn: [linkedin.com/in/aleshabuckins](https://www.linkedin.com/in/aleshabuckins/).

## Important

**Decision support for early design comparison, not a stamped design.** Final construction documents need review and seal by a licensed professional engineer.

---

Made by [Alesha Buckins](https://www.linkedin.com/in/aleshabuckins/).
