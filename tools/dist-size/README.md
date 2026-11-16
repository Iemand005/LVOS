# Dist size history chart

Plots the size history of `Dist/*.dist.js` bundles from the `Dist` (LVOS-dist) git submodule.

## Setup

```powershell
cd tools/dist-size
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run

From the repo root or this folder:

```powershell
python tools/dist-size/plot_dist_size.py
```

Saves `tools/dist-size/dist-size.png` and opens an interactive window (if available).
