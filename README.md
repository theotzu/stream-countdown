# Stream Countdown

A single-file, zero-dependency "stream starting soon" countdown. A YouTube stream
plays full-bleed behind it; everything is configured through URL params, so one
deployment covers every show and every episode.

## Use it

Open the page, press **S**, fill in the panel, hit **Copy shareable link**.
Paste that link into an OBS **Browser Source** (1920x1080), or just open it fullscreen (**F**).

## URL params

| param | meaning | default |
| --- | --- | --- |
| `mode` | `soon`, `brb` or `ending` — see below | `soon` |
| `show` | small label above the headline | `Moon Boys Podcast` |
| `headline` | the big text; overrides whatever the mode calls itself | mode's own |
| `sub` | optional line under the clock | none |
| `t` | start time, 24h `HH:MM` | `12:30` |
| `d` | date `YYYY-MM-DD`; blank means today, rolling to tomorrow once 3h past | none |
| `in` | count down N minutes from page load; overrides `t` and `d` | none |
| `v` | YouTube video/stream ID or full URL for the background | `TfWotiyXGfI` |
| `c` | accent colour, hex | `#7cf2ff` |
| `tz` | fixed UTC offset in hours, e.g. `-5`. Omit to use each viewer's own clock | none |

The start time is always labelled with its timezone. Without `tz` that is the
viewer's own zone as their machine names it (`CDT`, `GMT+1`); with `tz` it is the
fixed offset you pinned (`UTC-5`), because one offset spans several zones and no
abbreviation would be right for all of them.
| `audio=1` | play the video's sound, not just its picture | off |
| `vol` | volume `0`-`100`, with `audio=1` | `70` |
| `transparent=1` | drop the background entirely, to overlay on the real stream in OBS | off |
| `nostars=1` | hide the starfield | off |

Examples:

- `/?show=Moon%20Boys&t=12:30&tz=-5&v=TfWotiyXGfI` — starting soon at a set time
- `/?mode=brb&in=15` — back in fifteen minutes
- `/?mode=ending` — wrapping up, no clock

## Modes

Three things happen on a stream and they are the same page. `mode` picks which:

| mode | headline | at zero |
| --- | --- | --- |
| `soon` | Stream Starting Soon | red **We're Live** |
| `brb` | Be Right Back | red **Back Now** |
| `ending` | Stream Ending, with *Thanks for watching* under it | goes amber |

The small badge above the headline carries the status (`Wrapping up`, `Signing
off`) while the headline makes the statement, so the two never print the same
words.

`ending` says both things at once - the headline states it, the subline thanks
them - so its headline does not change when the clock runs out. Only the colour
does. Setting `sub` yourself replaces the thanks.

Only the words and the colour change — the clock, the video, the sound and the
timezone behave identically in all three.

For a break, `in` is usually what you want: `?mode=brb&in=15` counts down fifteen
minutes from the moment the page loads, so you don't have to work out the wall
clock time mid-stream.

`?mode=ending` on its own shows no clock at all — a stream wraps up when it wraps
up, and counting down to a default time would be a lie. Give it a `t` or an `in`
and the clock comes back.

Ending closes amber rather than red, because red is the "we are on air" colour
and reusing it to say goodbye reads as the opposite of what happened.

## Sound

Off by default - the overlay usually sits in a scene that already has audio.
Add `audio=1` for a music bed from the background video.

In an **OBS Browser Source it just starts**, because OBS runs its browser with
the autoplay restrictions relaxed. In an ordinary browser tab it cannot: nothing
is allowed to autoplay audibly before you have interacted with the page. There
the video still starts silently and a **Click for sound** button appears - and
any click or keypress anywhere on the page does the same thing, so hitting `F`
for fullscreen turns the sound on as a side effect.

`audio=1&transparent=1` is allowed and gives you the sound with no picture.

Once the clock hits zero the page flips to a red "We're Live" state on its own.

Keys: **S** settings, **F** fullscreen, **H** hide the hint.

## Deploy

One static file, no build step. Push to GitHub and import the repo on Vercel.
