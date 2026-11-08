# Valar UI Sources

Local packages from https://github.com/onevalar/valar-svelte.git.

## confirm-action / LICENSE.md

# Source and License

Native Svelte state-machine adaptation of free Arc ConfirmMorph (`uiarc.dev/r/confirm-morph.json`), as used by TokenPlan revision c588b28cc1a19a1bdd5964db5c791e2ec66d5ec4. Valar Button replaces source buttons; native timers replace Motion. Additional localized status labels avoid hardcoded English announcements.

The component-local `morph.ts` is independently authored Valar work (2026), not a translation of Arc animation code, CSS, springs or curves. It measures Svelte DOM updates and uses native Web Animations for size/radius/content feedback, with independently chosen timing and a direct reduced-motion path. The unchanged free original is executed only for browser timing/geometry observations. No Arc animation code/CSS/parameters, Pro source, React or Motion runtime is distributed. This is an intentional visual adaptation, not an equivalence claim. The adapted state machine retains the source MIT notice below; independent additions use the repository MIT license.

MIT License

Copyright (c) 2026 Elia Kuratli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## donut-chart / LICENSE.md

# Source and License

Svelte adaptation of TokenPlan's StaticDonut, based on free Arc DonutChart (`uiarc.dev/r/donut-chart.json`). Fixed-denominator annular sectors retained; React replaced with Svelte runes. Source revision: c588b28cc1a19a1bdd5964db5c791e2ec66d5ec4 in onevalar/token-plan.

MIT License

Copyright (c) 2026 Elia Kuratli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## gauge / LICENSE.md

# Source and License

Svelte adaptation of TokenPlan's read-only Arc Gauge (`uiarc.dev/r/gauge.json`). Source revision and changes: standards/porting-records/tokenplan-meters-react-to-svelte.md. Native Svelte runes and Valar tokens replace React/CSS modules.

MIT License

Copyright (c) 2026 Elia Kuratli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## ruler-slider / LICENSE.md

# Source and License

Native Svelte 5 adaptation of free MIT Arc RulerSlider (`uiarc.dev/r/ruler-slider.json`), as used by TokenPlan revision c588b28cc1a19a1bdd5964db5c791e2ec66d5ec4. The moving tape, gestures, horizontal wheel, inertia, rubber band and spring settling are reimplemented with component-local RAF physics and Valar semantic styling. Readout is synchronous; rolling digits are not provided (animateReadout=false). No React/Motion runtime, Pro code or source CSS is shipped.

MIT License

Copyright (c) 2026 Elia Kuratli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## segmented-control / LICENSE.md

# Source and License

Native Svelte composition of Valar ToggleGroup based on free Arc SegmentedControl's observable selection contract (`uiarc.dev/r/segmented-control.json`), as used by TokenPlan revision c588b28cc1a19a1bdd5964db5c791e2ec66d5ec4. Svelte snippets replace ReactNode accessories. No Motion layout animation or source CSS is shipped.

MIT License

Copyright (c) 2026 Elia Kuratli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## sparkline / LICENSE.md

# Source and License

Svelte adaptation of TokenPlan's StaticSparkline, based on free Arc Sparkline (`uiarc.dev/r/sparkline.json`). Zero baseline, calendar slots and null gaps retained; React replaced with Svelte runes. Source revision: c588b28cc1a19a1bdd5964db5c791e2ec66d5ec4 in onevalar/token-plan.

MIT License

Copyright (c) 2026 Elia Kuratli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## texture-fill / LICENSE.md

# Source and License

Adapted from `onevalar/token-plan`, `platforms/tauri/src/DitherFill.tsx`, revision c588b28cc1a19a1bdd5964db5c791e2ec66d5ec4. Also reviewed the in-progress native `src/svelte/usage/DitherFill.svelte` on 2026-11-07. Svelte effects replace React hooks; live reduced-motion changes, ancestor recoloring and explicit Canvas errors are retained/added. Application texture-choice/tint preferences are deliberately not part of this generic library primitive. No Arc source is involved.

MIT License

Copyright (c) 2026 Robin Ebers (original OpenUsage)
Copyright (c) 2026 onevalar (TokenPlan modifications)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## tick-meter / PROVENANCE.md

# Independent Provenance

TickMeter was authored for Valar on 2026-11-07 solely from the product requirements:

- Read-only percentage graphic, visually bounded to 0–100.
- Preserve raw overflow in visible number and caller-localized valueText; clamp aria-valuenow to 0–100 per the clarified integration requirement on 2026-11-07. Accept caller-localized label.
- Accent/danger tones using Valar primary/destructive tokens.
- Exactly 60 radial SVG line elements, calculated at six-degree intervals.
- No celebration, animation, circular CSS mask or missing-value state (caller handles missing).

No Arc Pro tick-ring implementation, CSS, assets or source-derived geometry was read, copied or translated. This is not a port of Arc Activity Rings. Valar's repository MIT license applies; no Arc Pro license or source is included in this component.


## waffle-chart / LICENSE.md

# Source and License

Svelte adaptation of TokenPlan's read-only Arc WaffleChart (`uiarc.dev/r/waffle-chart.json`). Largest-remainder allocation and bottom-left cell order retained. Native runes and Valar tokens replace React/CSS modules. Source revision: c588b28cc1a19a1bdd5964db5c791e2ec66d5ec4 in onevalar/token-plan.

MIT License

Copyright (c) 2026 Elia Kuratli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
