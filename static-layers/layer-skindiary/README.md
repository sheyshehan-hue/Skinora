# Skin progress diary

Customers rescan their face every 2 weeks and watch their skin change. Every AI skin scan becomes a diary
entry, and `diary.html` lines them up.

## What it adds
- `diary.html` (linked from the account page and the scan result):
  - the headline change since the first scan, for example "Redness down 20%", and the score from → to
  - "What changed since you started": all 8 measures as plain changes (Dryness, Oiliness, Visible pores,
    Breakouts, Redness, Dark spots, Dullness, Fine lines), each with its score from → to
  - a before and after slider with the customer's own photos, with a choice of which two scans to compare
  - a progress chart for the skin score or any one measure
  - a timeline of every scan with the change from the one before, a note ("Started the retinol"),
    and delete buttons for the photo or the whole entry
  - when the next scan is due (every 14 days) and a calendar reminder (.ics, repeats every 2 weeks)
  - a share picture (1080 × 1350) with the results, made in the browser; photos are added only if the
    customer ticks the box. Uses the phone's share sheet, or downloads the picture on a computer
  - "See an example" on the empty diary, a sample diary that is never saved
- Scan result screen: "Skin diary · Entry N" with the changes since the last scan and since the start, a
  "Keep this photo for my before and after" button, and "Open my skin diary".
- Account page: a Skin diary line in the My skin card with the headline change and the next scan date.
- Skin scan changes (made by `build.py` inside the scan script): rescans every 2 weeks instead of 4, the
  result text points to the diary, the consent text says a photo can be kept on the device, and the scan
  fires an `sks:scan` event when it finishes.

## How a change is worked out
Each score is out of 100, higher is better. The problem behind it is 100 minus the score, so Calm skin
60 → 68 means redness went from 40 to 32, which is "Redness down 20%". Changes under 3% read "about the same".

## Privacy
Nothing leaves the device. Scores and notes are in localStorage (`skd-diary`; scans the skin scan saved
in `skd-scans` are copied in, so the diary keeps more than the scan's last 12). A photo is kept only when
the customer taps "Keep this photo", resized to 720 px, in this browser's IndexedDB (`skinora-diary`).
"Delete my diary and photos" clears all of it. The diary makes no network calls.
For the live store, a signed-in customer may later want the diary on every device; that needs an opt-in
and server storage, and should keep photos optional.

## Build
`python3 build.py <site dir>`, after `layer-skinscan` and `layer-faceshape`. Idempotent.
