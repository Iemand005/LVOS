import datetime
import os
import subprocess

import matplotlib.pyplot as plt
import matplotlib.dates as mdates

ROOT = subprocess.check_output(
    ["git", "rev-parse", "--show-toplevel"], text=True, cwd=os.path.dirname(__file__) or "."
).strip()
DIST = os.path.join(ROOT, "Dist")
FILES = ["desktop.dist.js", "mobile.dist.js", "desktop.ie8.dist.js", "mobile.ie8.dist.js"]
OUT = os.path.join(os.path.dirname(__file__), "dist-size.png")


def history(name):
    log = subprocess.check_output(
        ["git", "-C", DIST, "log", "--reverse", "--format=%H %ct", "--", name],
        text=True,
    ).strip()
    if not log:
        return [], []
    dates, sizes = [], []
    for line in log.splitlines():
        h, ts = line.split()
        tree = subprocess.check_output(
            ["git", "-C", DIST, "ls-tree", "-r", "-l", h, "--", name], text=True
        ).strip()
        if not tree:
            continue
        size = int(tree.split()[3])
        dates.append(datetime.datetime.fromtimestamp(int(ts)))
        sizes.append(size / 1024.0)
    return dates, sizes


def main():
    plt.figure(figsize=(10, 5))
    plotted = False
    for name in FILES:
        dates, sizes = history(name)
        if not dates:
            continue
        plt.plot(dates, sizes, marker="o", markersize=3, linewidth=1.5, label=name)
        plotted = True
    if not plotted:
        raise SystemExit("No dist size history found in " + DIST)
    plt.title("LVOS dist bundle size over time")
    plt.xlabel("Date")
    plt.ylabel("Size (KB)")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.gca().xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m-%d"))
    plt.gcf().autofmt_xdate()
    plt.tight_layout()
    plt.savefig(OUT, dpi=150)
    print("Saved chart to " + OUT)
    try:
        plt.show()
    except Exception:
        pass


if __name__ == "__main__":
    main()
