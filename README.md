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
| `show` | small label above the headline | `Moon Boys Podcast` |
| `headline` | the big text | `Stream Starting Soon` |
| `sub` | optional line under the clock | none |
| `t` | start time, 24h `HH:MM` | `12:30` |
| `d` | date `YYYY-MM-DD`; blank means today, rolling to tomorrow once 3h past | none |
| `v` | YouTube video/stream ID or full URL for the background | `TfWotiyXGfI` |
| `c` | accent colour, hex | `#7cf2ff` |
| `tz` | fixed UTC offset in hours, e.g. `-5`. Omit to use each viewer's own clock | none |

The start time is always labelled with its timezone. Without `tz` that is the
viewer's own zone as their machine names it (`CDT`, `GMT+1`); with `tz` it is the
fixed offset you pinned (`UTC-5`), because one offset spans several zones and no
abbreviation would be right for all of them.
| `transparent=1` | drop the background entirely, to overlay on the real stream in OBS | off |
| `nostars=1` | hide the starfield | off |

Example: `/?show=Moon%20Boys&t=12:30&tz=-5&v=TfWotiyXGfI`

Once the clock hits zero the page flips to a red "We're Live" state on its own.

Keys: **S** settings, **F** fullscreen, **H** hide the hint.

## Deploy

One static file, no build step. Push to GitHub and import the repo on Vercel.
