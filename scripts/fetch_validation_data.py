"""
Idempotent acquisition script for Phase 1 simulator validation datasets:
  1. Official open-source nflverse CSV/GZIP releases (GitHub nflverse/nflverse-data):
     - play_by_play (2022, 2023, 2024)
     - ftn_charting (2022, 2023, 2024)
     - pbp_participation (2022, 2023, 2024)
     - nextgen_stats passing/receiving/rushing (2022, 2023)
  2. Official Kaggle Big Data Bowl 10 Hz tracking competitions (sanctioned API only):
     - nfl-big-data-bowl-2023 (2021 Weeks 1-8 pass protection & PFF line scouting)
     - nfl-big-data-bowl-2025 (2022 Weeks 1-9 full play + pre-snap motion/run/pass)
     - nfl-big-data-bowl-2026-analytics / prediction (2023 Weeks 1-18 passing)

Never attempts to bypass Kaggle authentication or scrape restricted endpoints.
If ~/.kaggle/kaggle.json (or KAGGLE_USERNAME + KAGGLE_KEY) is not configured,
prints exact setup / manual placement instructions for data/bdb/.
"""

import os
import sys
import zipfile
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
NFLVERSE_DIR = ROOT / "data" / "nflverse"
BDB_DIR = ROOT / "data" / "bdb"

NFLVERSE_ASSETS = [
    ("pbp", "play_by_play_2022.csv.gz"),
    ("pbp", "play_by_play_2023.csv.gz"),
    ("pbp", "play_by_play_2024.csv.gz"),
    ("ftn_charting", "ftn_charting_2022.csv"),
    ("ftn_charting", "ftn_charting_2023.csv"),
    ("ftn_charting", "ftn_charting_2024.csv"),
    ("pbp_participation", "pbp_participation_2022.csv"),
    ("pbp_participation", "pbp_participation_2023.csv"),
    ("pbp_participation", "pbp_participation_2024.csv"),
    ("nextgen_stats", "ngs_2022_passing.csv.gz"),
    ("nextgen_stats", "ngs_2022_receiving.csv.gz"),
    ("nextgen_stats", "ngs_2022_rushing.csv.gz"),
    ("nextgen_stats", "ngs_2023_passing.csv.gz"),
    ("nextgen_stats", "ngs_2023_receiving.csv.gz"),
    ("nextgen_stats", "ngs_2023_rushing.csv.gz"),
]

KAGGLE_COMPETITIONS = {
    "bdb2023": "nfl-big-data-bowl-2023",
    "bdb2025": "nfl-big-data-bowl-2025",
    "bdb2026": "nfl-big-data-bowl-2026-prediction",
}


def download_file(url: str, dest: Path) -> None:
    if dest.exists() and dest.stat().st_size > 1024:
        print(f"  [SKIP] {dest.name} ({dest.stat().st_size / 1e6:.2f} MB)")
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    print(f"  [GET]  {url} -> {dest.relative_to(ROOT)}")
    with requests.get(url, stream=True, timeout=60) as resp:
        resp.raise_for_status()
        with open(tmp, "wb") as f:
            for chunk in resp.iter_content(chunk_size=1024 * 512):
                if chunk:
                    f.write(chunk)
    tmp.replace(dest)
    print(f"  [OK]   {dest.name} ({dest.stat().st_size / 1e6:.2f} MB)")


def fetch_nflverse() -> None:
    print("\n=== 1. Fetching Public nflverse Data (2022-2024) ===")
    NFLVERSE_DIR.mkdir(parents=True, exist_ok=True)
    for tag, filename in NFLVERSE_ASSETS:
        url = f"https://github.com/nflverse/nflverse-data/releases/download/{tag}/{filename}"
        try:
            download_file(url, NFLVERSE_DIR / filename)
        except Exception as exc:
            print(f"  [WARN] Failed to fetch {filename}: {exc}")


def check_bdb_local() -> dict[str, list[str]]:
    found: dict[str, list[str]] = {}
    for folder in KAGGLE_COMPETITIONS:
        d = BDB_DIR / folder
        csvs = sorted([p.name for p in d.rglob("*.csv")]) if d.exists() else []
        found[folder] = csvs
    return found


def has_kaggle_creds() -> bool:
    kaggle_json = Path.home() / ".kaggle" / "kaggle.json"
    env_creds = bool(os.environ.get("KAGGLE_USERNAME") and os.environ.get("KAGGLE_KEY"))
    return kaggle_json.exists() or env_creds


def fetch_kaggle_bdb() -> bool:
    print("\n=== 2. Checking Kaggle 10 Hz Big Data Bowl Datasets ===")
    BDB_DIR.mkdir(parents=True, exist_ok=True)
    existing = check_bdb_local()
    missing = [k for k, files in existing.items() if not files]
    if not missing:
        for k, files in existing.items():
            print(f"  [OK] {k}: {len(files)} CSV files present")
        return True

    if not has_kaggle_creds():
        print("  [BLOCKED: CREDENTIALS] Kaggle 10 Hz competition downloads require authentication.")
        print(f"    Missing local datasets: {missing}")
        print("    Sanctioned ways to unlock 10 Hz replay:")
        print("      Option A (Kaggle API):")
        print("        1. Accept competition rules on kaggle.com for:")
        for folder, comp in KAGGLE_COMPETITIONS.items():
            print(f"           - https://www.kaggle.com/competitions/{comp}/rules")
        print(f"        2. Save your Kaggle API token to: {Path.home() / '.kaggle' / 'kaggle.json'}")
        print("        3. Run: uv pip install kaggle && py -3.12 scripts/fetch_validation_data.py")
        print("      Option B (Manual Browser Download):")
        for folder, comp in KAGGLE_COMPETITIONS.items():
            print(f"        Download {comp} archive -> extract CSVs into: {(BDB_DIR / folder)}")
        return False

    try:
        from kaggle.api.kaggle_api_extended import KaggleApi
    except ImportError:
        print("  [MISSING PKG] Kaggle credentials detected, but Python 'kaggle' package is not installed.")
        print("    Install via: py -3.12 -m pip install kaggle (or uv pip install kaggle)")
        return False

    api = KaggleApi()
    api.authenticate()
    all_ok = True
    for folder in missing:
        comp = KAGGLE_COMPETITIONS[folder]
        target = BDB_DIR / folder
        target.mkdir(parents=True, exist_ok=True)
        print(f"  [KAGGLE] Downloading {comp} -> {target}")
        try:
            api.competition_download_files(comp, path=str(target), quiet=False)
            for zf_path in target.glob("*.zip"):
                print(f"  [UNZIP] Extracting {zf_path.name}...")
                with zipfile.ZipFile(zf_path, "r") as zf:
                    zf.extractall(target)
                zf_path.unlink()
        except Exception as exc:
            all_ok = False
            print(f"  [ERROR] Kaggle download failed for {comp}: {exc}")
            print("    (Ensure you accepted competition rules on Kaggle web UI.)")
    return all_ok


def main() -> int:
    fetch_nflverse()
    bdb_ready = fetch_kaggle_bdb()
    print("\nSummary:")
    print(f"  nflverse dir: {NFLVERSE_DIR}")
    print(f"  BDB 10Hz ready: {bdb_ready}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
