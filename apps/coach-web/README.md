# Coach web boundary

The V1 coach surface is the Next/vinext route at `app/coach/`. This directory is
kept as the future home for coach-only assets and tests. Coach actions call the
Worker API; provider keys and health payloads never enter the browser bundle.
