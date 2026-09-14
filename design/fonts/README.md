# Fonts

`fredoka-600-numerals.woff` — Fredoka SemiBold (600), subset to numerals and a few unit glyphs (`0-9 % / . : × - + kcal DAY g ml`) with `tnum` and `kern` features. Used for numbers in the mini-program, inlined as base64 by `scripts/build-miniprogram-assets.ts`.

Source: Google Fonts (Fredoka, v17). Copyright 2016 The Fredoka Project Authors. Licensed under the SIL Open Font License 1.1 (https://openfontlicense.org), which permits subsetting, embedding and redistribution.

Regenerate from the full TTF with:

    python3 -m fontTools.subset Fredoka-SemiBold.ttf --text="0123456789%/.:×-+ kcalDAYgmlKCAL" --layout-features='tnum,kern' --flavor=woff --output-file=fredoka-600-numerals.woff
