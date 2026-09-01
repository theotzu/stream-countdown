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
| `sub` | optional line under the clock | mode's own |
| `badge` | the small pill above the headline | mode's own |
| `endline` | the headline once the clock hits zero | mode's own |
| `endbadge` | the badge once the clock hits zero | mode's own |
| `pre` | the word before the time (`Starts`, `Back`, `Ends`) | mode's own |
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
| `chart=1` | live chart behind the clock instead of the video | off |
| `csym` | what to chart, TradingView symbol | `BINANCE:BTCUSDT` |
| `ci` | timeframe: `1`, `5`, `60`, `1D`, `1W`&hellip; | `1D` |
| `ind` | indicators, comma separated; `-` for a bare chart | `moonboys` |
| `transparent=1` | drop the background entirely, to overlay on the real stream in OBS | off |
| `nostars=1` | hide the starfield | off |

Examples:

- `/?show=Moon%20Boys&t=12:30&tz=-5&v=TfWotiyXGfI` — starting soon at a set time
- `/?mode=brb&in=15` — back in fifteen minutes
- `/?mode=ending` — wrapping up, no clock
- `/?chart=1&audio=1` — live BTC chart with the music still playing

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

**A mode is only a set of defaults for the copy.** Every word on the page can be
replaced: `badge`, `headline`, `sub`, `pre`, and `endbadge` / `endline` for the
zero state. `?badge=Live` says Live and keeps saying it — a badge set by hand
holds at zero unless `endbadge` gives it something else to become. The headline
behaves the same way.

For a break, `in` is usually what you want: `?mode=brb&in=15` counts down fifteen
minutes from the moment the page loads, so you don't have to work out the wall
clock time mid-stream.

`?mode=ending` on its own shows no clock at all — a stream wraps up when it wraps
up, and counting down to a default time would be a lie. Give it a `t` or an `in`
and the clock comes back.

Ending closes amber rather than red, because red is the "we are on air" colour
and reusing it to say goodbye reads as the opposite of what happened.

## Putting a market on the screen

A countdown with nothing but music on it is dead air. `chart=1` replaces the
video with a live chart and pairs with `audio=1` to keep the music underneath:

```
/?chart=1&audio=1&t=12:30
```

Defaults to BTC on the daily. `csym` and `ci` change that.

Sub-minute intervals are not offered: seconds are a paid TradingView feature and
the free embed quietly serves 1-minute candles instead of saying so.

### The MoonBoys Line

**`chart=1` draws it by default** - the chart is there to carry the indicator, so
it should not need asking for twice:

```
/?chart=1&ci=1D&audio=1
```

It does not go through TradingView at all; it is drawn natively on a canvas from
Binance's public candles. `ind=-` gives a bare chart with nothing on it.

TradingView's free widget loads **built-in studies only**. Verified side by side:
`studies=RSI@tv-basicstudies` renders an RSI pane, `studies=PUB;5xZSUQ3b` renders
a clean chart with no indicator on it. Published Pine scripts need TradingView's
licensed Charting Library, so the only way to get this on the page was to draw it.

The rules, from the script's own description:

| state | condition | colour |
| --- | --- | --- |
| bullish | above **both** the 44 and 125 SMA | gold |
| bearish | below **both** the 44 and 125 SMA | blue |
| chop | between the 44 and the 125 | grey |
| risk zone | below the 200 SMA | red background |

**The averages are always daily, whatever the chart interval is.** That is the
character of the indicator: the Pine script pulls its 44/125/200 from the daily
timeframe, so dropping to a 1-minute chart leaves the same daily lines sitting
there while price moves against them. Candles come from `ci`; the averages come
from a separate daily series, and each displayed bar takes the daily value in
force at its own timestamp. Computing them on the loaded interval - which this
did at first - is a different indicator that only happens to match on the daily.

It is a reimplementation, not the Pine script running - worth eyeballing against
the real chart before trusting it on stream. Any other `ind` value still goes to
TradingView, where only built-in studies work.

### Why the chart is TradingView and not aggr

**aggr.trade cannot be embedded.** It serves `X-Frame-Options: DENY` and
`Content-Security-Policy: frame-ancestors 'self' *.aggr.trade`, so no page
anywhere is allowed to frame it - this one included, and OBS's browser enforces
that the same as any other. It is aggr's deliberate policy, not a bug to route
around.

**For real aggr on stream, layer it in OBS instead of embedding it:**

1. Add this page as a Browser Source, 1920x1080, with `chart=0&audio=1` (or the
   video background, whichever you want behind it).
2. Add a *second* Browser Source above it pointing at your aggr.trade layout.
3. Size and position it, and use **Crop** (Alt-drag its edges) to keep just the
   chart and the trade feed.

That gets you the real thing - orderbook, aggregated tape, liquidations - which
no embed could have given you anyway. Add `transparent=1` to this page if you
want the countdown text floating over the aggr source rather than the reverse.

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
