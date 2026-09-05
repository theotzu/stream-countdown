# Stream Countdown

A single-file, zero-dependency "stream starting soon" countdown. A YouTube stream
plays full-bleed behind it; everything is configured through URL params, so one
deployment covers every show and every episode.

## Use it

Open the page, press **S**, fill in the panel, hit **Copy shareable link**.
Paste that link into an OBS **Browser Source** (1920x1080), or just open it fullscreen (**F**).

Opened with no settings at all, it shows you the panel rather than a countdown
to a time you did not set.

Nothing is stored anywhere and there is no account: every setting lives in the
link, so the link IS the config. Save different ones for different shows.

**Deploy your own** in about a minute: fork this repo, import it on Vercel (no
build step, no environment variables), and point your browser source at your own
URL. Or download `index.html` and give OBS the local file - it works from disk,
though the price tape and chart need an internet connection like anything else.

### Your channels

The panel has a **Twitch channel** and a **Kick channel** box. Fill either or
both and that chat's emotes fly up the screen, with a bitcoin mark for every
message so you can see chat moving while you are fullscreen. Leave them blank
for no chat wall. Read-only and anonymous - no login, no token, nothing to
authorise.

## URL params

| param | meaning | default |
| --- | --- | --- |
| `mode` | `soon`, `brb` or `ending` — see below | `soon` |
| `show` | small label above the headline | none |
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
| `twitch` | twitch channel whose chat emotes fly up the screen | none |
| `kick` | kick channel slug, same | none |
| `emoji=0` | ignore plain unicode emoji, platform emotes only | on |
| `coin=0` | stop the bitcoin mark that rises for every chat message | on |
| `ticker` | symbols for the price tape across the top; `-` for none | ~top 30, no stablecoins |
| `tspeed` | how fast the tape reads, in pixels per second | `55` |
| `chart=1` | live chart behind the clock instead of the video | off |
| `csym` | what to chart, TradingView symbol | `BINANCE:BTCUSDT` |
| `ci` | timeframe: `1`, `5`, `60`, `1D`, `1W`&hellip; | `1D` |
| `ind` | `moonboys`, `volume`, `macd` &mdash; comma separated; `-` for a bare chart | `moonboys` |
| `crosses=0` | hide the gold / silver / death cross columns | on |
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

## The emote wall

Emotes posted in chat fly up the screen.

Set either channel in the panel, or by URL. With both set, the wall fills from
whichever chat is busier - one wall, two platforms, no way to tell from looking
which line came from where, which is the point:

```
/?twitch=yourchannel&kick=yourchannel
```

**Neither is set by default.** It used to default to the Moon Boys channels,
which was fine while this ran on one stream and wrong the moment it ran on
anyone else's: a stranger's first load should not pull somebody else's chat onto
their screen. `-` also drops either one, for a link that has to override a
channel rather than inherit it.

Both are read **anonymously** — no token, no account, no server of ours in
between. Twitch is IRC over WebSocket joined as `justinfan<random>`, a read-only
guest session they support on purpose; the `twitch.tv/tags` capability is what
makes emotes identifiable. Kick is Pusher on `chatrooms.<id>.v2`, with the id
from their channel API, which reflects the page's origin back so the browser is
allowed to ask. Both were verified against live chat before this was written.

Each emote takes its own path: it weaves side to side by a random amount in a
random direction, at a random size and tilt, over roughly ten seconds, and holds
full opacity until about three quarters of the way up before dissolving slowly
rather than blinking out. A hundred identical rises up the same line read as an
animation; this reads as chat.

**Every message sends a bitcoin mark up the wall, emote or not.** Theo,
2026-09-05: "i would like to see a bitcoin logo on the emote wall every time
someone puts a message in those chats as well. just so i can spot any chat
activity while watching fullscreen." That is the gap it fills - the wall only
ever showed emotes, so a chat full of people typing sentences looked exactly
like a chat with nobody in it. The coins run smaller than emotes (26-42px
against 38-72px) because they are a heartbeat rather than a message: one per
line typed, so at full size a busy chat would be a wall of Bitcoin with the
emotes lost in it. It is the same vector mark the chart badge uses, so it costs
no network either. `coin=0` turns it off.

Plain unicode emoji fly too; `emoji=0` limits it to real platform emotes. At
most 44 are on screen at once, so a raid cannot melt the page, and either socket
reconnects on its own with backoff — a stream outlasts any single connection.

**Pump.fun is not supported.** Its public API answers 530 and its chat sits
behind a login, so there is no anonymous read to make. Rather than half-support
it, nothing pretends to watch it.

## The price tape

A scrolling tape of live prices runs across the top by default, with the
24-hour move beside each one. Prices come from Binance's public 24hr endpoint -
keyless, open CORS - and refresh **every 5 seconds** while the page is visible.

The tape's DOM is built once and then written into; only the numbers change.

**It reads at a measured 55 px/s, and the DOM is built for the symbols that were
asked for rather than the ones that have answered.**

- The speed is now a real number. `rows.length * 5` seconds was reaching for a
  constant reading speed and could not get there, because symbols are not the
  same width - BTC at $118,432.10 is half again as wide as SUI at $3.41.
  Measured, 31 symbols over a 7,397px loop in 155s is **47.7 px/s**. The
  duration is now the measured track width over `tspeed`.

**Slow is deliberate, and it took being wrong once to learn why.** Theo,
2026-09-05, reported the tape "feels a bit choppy as if its moving slower than
intended", and the first fix took it to 90 px/s. His read after watching it
back: *"the site wasnt chopping, it was twitch. making it faster actually made
the chop worse lol."* That is the right way round - the tape is composited and
moving smoothly in the browser, and what he was watching was a 30fps encode. A
wide band of small text sliding sideways is close to worst case for an encoder:
every frame differs from the last across the entire width of the screen, and
more speed means more difference per frame. **On stream, slower reads better.**
`tspeed` is a URL param so it can be tuned against a live stream in seconds.
- The two sources do not arrive together: Binance answers in the first second,
  CoinGecko brings HYPE, TON and BSV up to twenty seconds later. That changed
  the built symbol list, which rewrote animation-duration from 140s to 155s -
  and a duration change keeps the elapsed time, so the *progress* moves and the
  tape walks backwards about a hundred pixels. It happened at the same moment on
  every stream. Building the full list up front, with a dash where a price has
  not landed yet, means the width never changes; re-timing now preserves the
  scroll position rather than jolting it.

Worth recording because it was checked rather than assumed: replacing the
track's children does **not** restart the animation - the animation lives on
`#tapeTrack`, which survives an innerHTML write, and its clock reads the same
millisecond either side of one. This file used to say otherwise. The scroll is
also genuinely composited (`ActiveTransformAnimation`, 2 paints in a layer of
its own), so the choppiness was never a repaint problem.

The two sources are polled at different rates on purpose. Binance takes 5s
happily - 31 symbols is 40 weight per call, 480/min against a 6000/min ceiling.
CoinGecko's free tier is a fraction of that and would answer a 429, freezing
HYPE, TON and BSV on stale numbers, so those three move on a 20-second timer.

`ticker=BTC,ETH,SOL` picks the symbols and their order. There is deliberately no
panel control for it - the default needs no fiddling - but a list set by URL
survives Copy shareable link. `ticker=-` turns it off,
and it never appears in `transparent=1` overlay mode.

Stablecoins are deliberately absent from the default - a tape reporting USDT at
$1.00 all day wastes the space.

**Binance does not list everything.** HYPE, TON and BSV have no USDT pair there
(checked against `exchangeInfo`, not assumed), so those come from CoinGecko,
which is also keyless and CORS-open. Add a symbol Binance lacks and it will
simply not appear unless it is mapped in `GECKO_IDS`. One source being down
thins the tape rather than blanking it.

## Putting a market on the screen

A countdown with nothing but music on it is dead air. `chart=1` replaces the
video with a live chart and pairs with `audio=1` to keep the music underneath:

```
/?chart=1&audio=1&t=12:30
```

Defaults to BTC on the daily. `csym` and `ci` change that.

The chart says what it is a chart of: the coin's own mark, its ticker and the
timeframe sit at the top left, under the tape - `BTC  1 day`, no quote
currency. Theo, 2026-09-05: "remove the one that says usdt. we can just say btc
1 day." The full pair is still spelled out in the caption along the bottom.

The regime line that used to sit under it - "Above the 44 and 125" - is gone at
his request: the chart already draws both averages and shades the band between
them, so the line was narrating something on screen. The **risk-zone** warning
stays, because it is a different statement - it fires only below the 200, which
the shading alone does not shout. Theo, 2026-09-05 — "we could
probably somewhere indicate that we are looking at the bitcoin price as that
small note in the bottom left corner is so small thats it hardly noticeable."
**Bitcoin's mark is in the file** - one SVG path, no network, right every time.
Theo, 2026-09-05: "use the actual btc logo tho. not some orange circle that says
btc lol." He was looking at the fallback: CoinGecko's artwork call is
rate-limited on the free tier, and when it 429s the badge drew a lettered disc,
which for the one coin this is nearly always pointed at is a poor showing. Every
other coin still comes from CoinGecko - asked for even when `ticker=-` turns the
tape off - and still falls back to a disc with the ticker on it.

The badge is a **DOM element at z-index 3, not canvas**. The scrim that dims the
chart so the clock can be read over it sits at z-index 2, and a label dimmed
along with the thing it labels is a label nobody reads - Bitcoin orange under
45% murk is brown. It appears over the native chart only; TradingView prints its
own symbol in the corner.

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

### What else the native chart draws

`ind=moonboys,volume,macd` combines them: volume along the floor of the price
pane, MACD 12/26/9 in a pane of its own beneath it. MACD reads off the chart's
own timeframe, the way it normally is - unlike the MoonBoys averages, which stay
pinned to the daily.

Anything else asked for is **named on the chart** as not available, rather than
dropped in silence. Only `-` (a bare chart) routes to TradingView's built-ins.

It is a reimplementation, not the Pine script running - worth eyeballing against
the real chart before trusting it on stream. Any other `ind` value still goes to
TradingView, where only built-in studies work.

### Crosses

When the averages cross, a translucent column runs the height of the screen
through that candle - down to the floor of the price pane when MACD is up,
since MACD is a second chart with its own axis and a price cross has nothing
to say about it. Theo, 2026-09-05: "i used to have an indicator like
that and i loved it but i havent been able to find it in years."

| | which pair | colour |
| --- | --- | --- |
| **Golden cross** | the 44 crosses **up** through the 200 | gold |
| **Death cross** | the 44 crosses **down** through the 200 | red, with a skull at the top |
| **Silver cross** | the 44 crosses **up** through the 125 | silver |

The classic names assume 50/200, and this chart runs 44/125/200, so golden and
death are the 44 against the 200 - the same relationship everyone means by
them - and silver is the shorter, earlier 44 against the 125.

The averages stay pinned to the daily whatever the chart's timeframe, so on an
intraday chart a cross lands on the bar where the **daily** value flipped, which
is the honest place for it rather than the nearest intraday candle.

The column is drawn over the candles, not behind them, at a flat 28% edge to
edge. It took two wrong turns to land there, both worth recording:

- It began as a 20% band with a brighter 1.5px core, so a wide band on a daily
  chart would still read as a line. On silver - a colour that is nearly white
  already - the core read as a separate object: *"the silver cross seems to
  have a weird white line inside it."*
- Replacing the core with a gradient across the width fixed that and introduced
  the opposite problem: *"a bit blurry on its sides. i was hoping it would be a
  bit more uniform."*

One alpha, no core, no falloff. A band of glass laid over the candle, which is
what was asked for in the first place - a transparent vertical line, not a glow.
Silver was also cooled from `207,216,227` toward blue, so it reads as metal
rather than as a stray white line.

It is drawn outside the price pane's clip on purpose: a column that stopped at
the edge of the plot would be a highlight on a chart, and this is a marker on
the screen.

`crosses=0` turns them off.

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

## Licence

MIT - see `LICENSE`. Use it, change it, ship it in your own stream, sell what
you build with it. No attribution required, though it is always welcome.

The **MoonBoys Line** drawn by `ind=moonboys` is Theo Tzu's own indicator and is
published free on TradingView; it ships here for the same reason it is published
there.
