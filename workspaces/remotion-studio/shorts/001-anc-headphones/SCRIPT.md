# How Noise-Cancelling Headphones Work — SCRIPT

## Facts (with sources)

| Claim | Source |
|---|---|
| Active noise cancellation works by generating a sound wave with inverted phase (anti-phase) that destructively interferes with incoming noise | Wikipedia, *Active noise control*; Bose technical papers |
| Destructive interference: two identical waves 180° out of phase cancel to near-zero amplitude | Standard wave physics |
| ANC works best on **low-frequency, steady** sound (engine hum, fan noise); it struggles with sudden, high-frequency sound (a shout, a baby crying) | Multiple ANC vendor technical docs (Bose, Sony) |
| The microphone samples noise *outside*, the chip inverts it, the speaker plays it *at your ear*, milliseconds later | Bose/Sony ANC architecture docs |
| Feedback ANC also uses a microphone *inside* the cup to correct what's left | Standard ANC literature |

**Physical cause and effect:** sound is a pressure wave; adding an equal wave upside down gives zero pressure.

**Everyday analogy:** pushing a swing — push at exactly the wrong moment and the swing stops.

---

## Script (target ~62 s at ~3.7 words/s ≈ 230 words)

**Hook**
"Noise-cancelling headphones don't block sound. They make the opposite of it."

**Setting**
"Put them on in a plane. The engines roar, and then they don't."

**Action (escalation)**
"Inside the cup, a microphone listens to the roar. A chip flips that sound upside down. Then a tiny speaker plays it, right into your ear."

**Snap**
"Two waves meet. Peak touches trough. And they cancel each other out. Silence."

**Deadpan double line**
"Luckily, that works beautifully on a droning engine. Unluckily, it does almost nothing against a baby crying."

**Explanation (analogy)**
"Think of pushing a swing. Push at the wrong moment, and you cancel its motion. The chip is just pushing the air at exactly the wrong moment, a thousand times a second."

**Consequence**
"That's why the headphones feel like pressure when you switch them on. Your ears can't hear the wave, but they can still feel it."

**Callback twist**
"The engine never got quieter. You just got a second engine, playing the exact opposite."

---

## Word count
230 words → ~62 s at 3.7 words/s. Fits the 55–70 s target.

## Visual beats (for story.ts)

| Beat | Visual |
|---|---|
| Hook | Close on headphones; sound waves visibly bouncing off, not entering |
| Setting | Plane cabin, engine roar as thick waves |
| Action | Cut inside the ear cup: mic, chip, speaker |
| Snap | Two waves meeting — crest into trough — flat line |
| Double line | Engine hum vanishes; baby cry passes straight through |
| Analogy | Kid on a swing, parent pushing at the wrong moment |
| Consequence | Pressure feeling inside the ear |
| Twist | Two identical engines running opposite, cancelling |

## Rules from the skill
- No captions or labels on screen.
- English only.
- Voice: one steady tone.
- Jokes are researched real facts.
