# What if the Earth stopped spinning?

## Sources (every claim on screen traces to one of these)

| # | Claim | Source |
|---|---|---|
| 1 | Equator moves east at ~1,670 km/h (465 m/s); zero at the poles; scales as cos(latitude) | Wikipedia, *Earth's rotation*; Ohio State Ast 161 |
| 2 | One rotation takes 23 h 56 m 4 s (sidereal day) | Wikipedia, *Earth's rotation*; New Scientist |
| 3 | If rotation stops, day = year; each side gets 6 months light, 6 months dark | New Scientist; BBC Science Focus |
| 4 | Ocean bulge (≈8 km) relaxes toward the poles: two polar oceans, dry equatorial belt | UC Geography (Fraczek, *ArcUser*); BBC Science Focus |
| 5 | Atmosphere thins at the equator, thickens at the poles; only mid-latitudes keep survivable pressure | Live Science (Bloomfield) |
| 6 | Wind: air keeps 1,100 mph (1,770 km/h) at the equator — everything not attached to bedrock is wiped | Smithsonian How Things Fly; Live Science (Zimbelman) |
| 7 | We are **not** flung off. You'd need 28,437 km/h to be lifted | New Scientist |
| 8 | Braking over 1 minute = 0.75 g sideways deceleration; "down" tilts ~38° — enough to topple buildings | BBC Science Focus |
| 9 | Rotation is already slowing: days +~2 ms per century (tidal friction) | Wikipedia; New Scientist |
| 10 | No natural force could stop it; it has spun since it formed | Live Science (Zimbelman) |

**The twist that makes the video work:** everyone expects "we'd all fly into space."
We wouldn't. Gravity wins. The problem is everything *else* that keeps moving — and then
everything that stops.

## Script (2:30 target — ~340 spoken words)

Pace 2.3 w/s → ~148 s of speech + 8 scenes of breathing room.

| # | Scene (SVG) | Hindi `say` | Hinglish `sub` | English on-screen |
|---|---|---|---|---|
| 1 | `earth-spin` | सवाल: अगर धरती घूमना बंद कर दे तो क्या होगा? | Sawaal: agar dharti ghoomna band kar de, toh kya hoga? | WHAT IF THE EARTH STOPPED SPINNING? |
| 2 | `earth-spin-wide` | अभी, आप जहाँ खड़े हैं, धरती आपको पूरब की ओर ले जा रही है। | Abhi, aap jahan khade hain, dharti aapko pooraab ki ore le ja rahi hai. | You are already moving. |
| 3 | `earth-brake` | भूमध्य रेखा पर रफ़्तार सत्रह सौ किलोमीटर प्रति घंटा। पूरब की ओर। | Bhūmadhya rekha par raftaar 1,670 km/h. purab ki ore. | 1,670 km/h — then zero. |
| 4 | `earth-fling` | तो लोग सोचते हैं हम सब उड़ जाएँगे। उड़ेंगे नहीं। गुरुत्वाकर्षण ज़्यादा ताक़तवर है। | Toh log sochte hain hum sab ud jayenge. Udenge nahi. Gurutvakarshan zyada taqatwar hai. | You don't fly off. |
| 5 | `earth-weather` | लेकिन हवा नहीं रुकेगी। वो सत्रह सौ किलोमीटर प्रति घंटे से चलती रहेगी। | Lekin hawa nahi rukegi. Wo 1,670 km/h se chalti rahegi. | The air does not stop. |
| 6 | `earth-day-year` | और एक दिन पूरे साल का हो जाएगा। छह महीने धूप, छह महीने रात। | Aur ek din poore saal ka ho jayega. 6 mahine dhoop, 6 mahine raat. | One day = one year. |
| 7 | `earth-ocean-poles` | समुद्र भूमध्य रेखा छोड़कर ध्रुवों पर जमा हो जाएगा। बीच में सूखी ज़मीन। | Samudra Bhūmadhya rekha chhodkar dhruvon par jama ho jayega. Beech mein sookhi zameen. | Two oceans. One dry belt. |
| 8 | `earth-fire-ice` | एक तरफ़ हमेशा दिन, दूसरी तरफ़ हमेशा रात। | Ek taraf hamesha din, doosri taraf hamesha raat. | 6 months sun. 6 months dark. |
| 9 | `earth-numbers` | और अच्छी खबर: ये कभी होने वाला नहीं है। | Aur achhi khabar: ye kabhi hone wala nahi hai. | It cannot happen. |
| 10 | `earth-callback` | धरती तब भी घूम रही होगी। बस थोड़ी धीमी। | Dharti tab bhi ghoom rahi hogi. Bas thodi dheemi. | Still spinning. Slightly slower. |

## Beats (skill's arc, scaled to 2:30)

| Beat | Scenes | Time | Job |
|---|---|---|---|
| Hook | 1–2 | 0:00–0:22 | Name the absurd question; make the viewer realise they're already moving |
| Stakes | 3 | 0:22–0:38 | The number: 1,670 km/h |
| Twist (the "solution" slot) | 4 | 0:38–1:00 | Subvert the expected answer — you don't fly off |
| How it works | 5–8 | 1:00–2:10 | Air, day, ocean, light — four consequences, one each |
| Payoff | 9–10 | 2:10–2:30 | It can't happen. Callback to the opening shot. |

## Style lock

- **Palette:** space #080d18 · land #2f6b4f · water #1b3a63 · heat #ff5a3c · calm #5fd0a0
- **Meaning:** heat = speed/danger, calm = the answer/relief. Never swapped.
- **Type:** Poppins. Diagram labels 26 px; on-screen titles handled by scene templates.
- **Motion:** one easing curve (`ease` in theme.ts); entrances are fades and rises only.
- **Metaphor:** the planet is a *machine that keeps running after you switch it off*. Air, water and light are the parts that keep spinning.
