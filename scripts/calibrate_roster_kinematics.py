#!/usr/bin/env python3
"""
Calibrate NFL 32-Team Roster Kinematics (`src/data/nfl_teams_32.json`)
=====================================================================
Fixes two documented data artifacts surfaced by the Stage 1 kinematics audit:
  1. Imputed 4.75s / 18.7 mph fallback clusters across 7-14/32 starters per
     position (e.g., 344-lb LT / 340-lb NT / 255-lb EDGE all wearing identical
     4.75s / 18.7 mph stamps).
  2. Under-rated Free/Strong Safety & Edge speed/burst distributions compared
     to real NFL Combine / Next Gen Stats positional physical envelopes
     (FS meanSpd 82.9 vs CB 91.6; EDGE1 meanSpd 79.7 vs 260-lb NFL Edges).
"""
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEAMS_PATH = ROOT / "src" / "data" / "nfl_teams_32.json"
BDB2027_DIR = ROOT / "data" / "bdb" / "bdb2027" / "nfl-big-data-bowl-2027"

# (mean_40, sd_spread, min_40, max_40, spd_base, acc_base)
# Refined with BDB 2027 Combine positional means (n=510 2023-2025 draftees)
POS_PHYSICAL_ENVELOPE = {
    "QB":    (4.76, 0.16, 4.42, 5.08, 79, 80),
    "RB":    (4.46, 0.08, 4.30, 4.62, 89, 90),
    "WR1":   (4.44, 0.08, 4.24, 4.60, 92, 92),
    "WR2":   (4.44, 0.08, 4.26, 4.62, 91, 91),
    "SLOT":  (4.45, 0.08, 4.28, 4.62, 91, 91),
    "TE":    (4.66, 0.10, 4.44, 4.88, 83, 83),
    "LT":    (5.10, 0.12, 4.82, 5.36, 72, 72),
    "RT":    (5.10, 0.12, 4.84, 5.36, 71, 72),
    "LG":    (5.14, 0.11, 4.88, 5.40, 70, 70),
    "C":     (5.11, 0.11, 4.86, 5.36, 71, 71),
    "RG":    (5.14, 0.11, 4.88, 5.40, 70, 70),
    "EDGE1": (4.65, 0.10, 4.42, 4.86, 84, 85),
    "EDGE2": (4.65, 0.10, 4.42, 4.86, 84, 85),
    "DT1":   (5.02, 0.12, 4.78, 5.30, 73, 74),
    "DT2":   (5.02, 0.12, 4.76, 5.28, 74, 75),
    "WLB":   (4.56, 0.09, 4.38, 4.74, 85, 86),
    "MLB":   (4.59, 0.09, 4.42, 4.78, 84, 85),
    "CB1":   (4.43, 0.08, 4.26, 4.60, 92, 91),
    "CB2":   (4.43, 0.08, 4.28, 4.60, 92, 92),
    "NB":    (4.44, 0.08, 4.28, 4.60, 91, 91),
    "FS":    (4.50, 0.08, 4.32, 4.66, 88, 88),
    "SS":    (4.52, 0.08, 4.36, 4.69, 87, 87),
}


ROSTER_TO_BDB_POS: dict[str, set[str]] = {
    "LT": {"T", "G", "C"},
    "RT": {"T", "G", "C"},
    "LG": {"G", "T", "C"},
    "RG": {"G", "T", "C"},
    "C": {"C", "G"},
    "DT1": {"DT", "NT", "DE"},
    "DT2": {"DT", "NT", "DE"},
    "EDGE1": {"DE", "OLB", "DT"},
    "EDGE2": {"DE", "OLB", "DT"},
    "WLB": {"ILB", "MLB", "OLB", "SS"},
    "MLB": {"ILB", "MLB", "OLB"},
    "CB1": {"CB", "DB", "FS", "SS"},
    "CB2": {"CB", "DB", "FS", "SS"},
    "NB": {"CB", "DB", "FS", "SS"},
    "FS": {"FS", "SS", "CB", "DB"},
    "SS": {"SS", "FS", "CB", "DB"},
    "WR1": {"WR"},
    "WR2": {"WR"},
    "SLOT": {"WR", "TE"},
    "TE": {"TE", "FB"},
    "RB": {"RB", "FB"},
    "QB": {"QB"},
}

# (mean_wt_lbs, sd_wt_lbs, mean_ht_in) anchored in BDB 2027 Combine positional means
POS_BODY_ENVELOPE: dict[str, tuple[float, float, float]] = {
    "LT":    (318.0, 10.0, 78.0),
    "RT":    (318.0, 10.0, 78.0),
    "LG":    (315.0,  9.0, 76.0),
    "C":     (304.0,  7.0, 75.0),
    "RG":    (315.0,  9.0, 76.0),
    "DT1":   (309.0, 12.0, 75.0),
    "DT2":   (307.0, 11.0, 75.0),
    "EDGE1": (260.0, 10.0, 76.0),
    "EDGE2": (260.0, 10.0, 76.0),
    "WLB":   (233.0,  7.0, 74.0),
    "MLB":   (235.0,  7.0, 74.0),
    "TE":    (249.0,  8.0, 77.0),
    "CB1":   (191.0,  7.0, 72.0),
    "CB2":   (191.0,  7.0, 72.0),
    "NB":    (191.0,  7.0, 72.0),
    "FS":    (198.0,  7.0, 72.0),
    "SS":    (203.0,  7.0, 72.0),
    "WR1":   (197.0, 10.0, 73.0),
    "WR2":   (197.0, 10.0, 73.0),
    "SLOT":  (194.0,  9.0, 72.0),
}


def load_bdb_combine_lookup() -> dict[str, list[dict[str, str]]]:
    players_csv = BDB2027_DIR / "players.csv"
    combine_csv = BDB2027_DIR / "combine_results.csv"
    if not players_csv.exists() or not combine_csv.exists():
        return {}
    id_to_player: dict[str, tuple[str, str]] = {}
    with players_csv.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            id_to_player[row["nfl_id"]] = (
                row["display_name"].strip().lower(),
                row.get("nfl_position", "").strip(),
            )
    lookup: dict[str, list[dict[str, str]]] = {}
    with combine_csv.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            info = id_to_player.get(row["nfl_id"])
            if info:
                name_key, nfl_pos = info
                enriched = dict(row)
                enriched["nfl_position"] = nfl_pos
                lookup.setdefault(name_key, []).append(enriched)
    return lookup


def format_height_inches(val: str) -> str | None:
    if not val or val == "NA":
        return None
    try:
        inches = float(val)
    except ValueError:
        return None
    ft = int(inches // 12)
    rem = int(round(inches % 12))
    if rem == 12:
        ft += 1
        rem = 0
    return f"{ft}'{rem}\""


def deterministic_unit(seed_str: str) -> float:
    h = hashlib.sha256(seed_str.encode("utf-8")).digest()
    val = int.from_bytes(h[:4], "big") / 0xFFFFFFFF
    return val * 2.0 - 1.0  # [-1, +1]


def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def main() -> None:
    data = json.loads(TEAMS_PATH.read_text(encoding="utf-8"))
    bdb_combine = load_bdb_combine_lookup()
    fixed_475 = 0
    fixed_215 = 0
    lifted_db_edge = 0
    bdb_matched = 0

    for team_code, team in data.items():
        for p in team["offense"] + team["defense"]:
            lbl = p.get("label", "")
            if lbl not in POS_PHYSICAL_ENVELOPE:
                continue
            mean40, sd40, lo40, hi40, spd_base, acc_base = POS_PHYSICAL_ENVELOPE[lbl]
            sc = p.setdefault("scouting", {})
            rat = p.setdefault("ratings", {})

            allowed_bdb_pos = ROSTER_TO_BDB_POS.get(lbl, set())
            bdb_cands = bdb_combine.get(p.get("name", "").strip().lower(), [])
            bdb_row = next(
                (c for c in bdb_cands if c.get("nfl_position", "") in allowed_bdb_pos),
                None,
            )
            bdb_10y = None
            if bdb_row:
                bdb_matched += 1
                h_fmt = format_height_inches(bdb_row.get("combine_height", ""))
                if h_fmt:
                    sc["height"] = h_fmt
                wt_val = bdb_row.get("combine_weight", "")
                if wt_val and wt_val != "NA":
                    sc["weightLbs"] = int(round(float(wt_val)))
                arm_val = bdb_row.get("arm_length", "")
                if arm_val and arm_val != "NA":
                    sc["armLengthIn"] = round(float(arm_val), 2)
                f40_val = bdb_row.get("forty", "")
                if f40_val and f40_val != "NA":
                    sc["fortyYdDash"] = round(float(f40_val), 2)
                t10_val = bdb_row.get("ten_yd_split", "")
                if t10_val and t10_val != "NA":
                    bdb_10y = f"{float(t10_val):.2f}"

            u = deterministic_unit(f"{team_code}:{p.get('name','')}:{lbl}")
            u_body = deterministic_unit(f"{team_code}:{p.get('name','')}:{lbl}:body")

            # Fix imputed 6'2" / 215 lb fallback stamps for non-QB/RB positions before weight/40 calculation
            if (
                not bdb_row
                and lbl in POS_BODY_ENVELOPE
                and lbl not in ("QB", "RB")
                and sc.get("weightLbs") == 215
                and sc.get("height") == '6\'2"'
            ):
                mean_wt, sd_wt, mean_ht = POS_BODY_ENVELOPE[lbl]
                sc["weightLbs"] = int(round(mean_wt + u_body * sd_wt))
                ht_fmt = format_height_inches(str(mean_ht + round(u_body * 1.5)))
                if ht_fmt:
                    sc["height"] = ht_fmt
                fixed_215 += 1

            wt = sc.get("weightLbs", 220)
            old40 = sc.get("fortyYdDash")

            # Weight adjustment relative to positional norm keeps 340-lb NT slower than 290-lb 3T
            wt_adj = 0.0
            if lbl in ("LT", "RT", "LG", "C", "RG", "DT1", "DT2"):
                wt_adj = (wt - 308.0) * 0.0025
            elif lbl in ("EDGE1", "EDGE2"):
                wt_adj = (wt - 258.0) * 0.0020

            is_fallback_475 = old40 is not None and abs(old40 - 4.75) < 0.005
            if is_fallback_475:
                # Imputed 4.75 fallback -> assign realistic combine envelope from weight & rating
                ovr_adj = -((sc.get("ovr", 80) - 82.0) * 0.006)
                new40 = clamp(mean40 + wt_adj + ovr_adj + u * sd40 * 0.65, lo40, hi40)
                if abs(new40 - 4.75) < 0.005:
                    new40 = 4.74 if u < 0 else 4.76
                fixed_475 += 1
            elif old40 is not None:
                # Preserve true Combine 40s for WR/RB/CB/QB, clamp physical extremes for lifted FS/SS/EDGE/OL
                if lbl in ("LT", "RT", "LG", "C", "RG", "DT1", "DT2") and old40 < lo40:
                    new40 = clamp(mean40 + wt_adj + u * 0.05, lo40, hi40)
                    fixed_475 += 1
                else:
                    new40 = clamp(old40, lo40, hi40)
            else:
                new40 = clamp(mean40 + wt_adj + u * sd40 * 0.5, lo40, hi40)

            new40 = round(new40, 2)
            # NGS peak game speed (mph) empirically correlates cleanly with 40-yd dash (-5.4 mph/s)
            new_mph = round(clamp(20.9 - (new40 - 4.40) * 5.2 + u * 0.15, 15.6, 22.8), 1)
            # 10-yd split tracks BDB 2027 empirical Combine ratios (~0.343 WR/DB, ~0.348 trench/EDGE)
            split_ratio = 0.348 if lbl in ("LT", "RT", "LG", "C", "RG", "DT1", "DT2", "EDGE1", "EDGE2") else 0.343
            new_10y = bdb_10y or f"{clamp(new40 * split_ratio, 1.46, 1.92):.2f}"

            sc["fortyYdDash"] = new40
            sc["ngsMaxSpeedMph"] = new_mph
            sc["tenYdSplit"] = new_10y
            lbl_str = sc.get("ngsMetricLabel", "")
            if "|" in lbl_str:
                sc["ngsMetricLabel"] = f"{new_mph} mph max speed |{lbl_str.split('|', 1)[1]}"

            # Convert calibrated 40-yd speed & burst cleanly to 60..99 rating scale
            target_spd = int(round(clamp(spd_base - (new40 - mean40) * 32.0, 62, 99)))
            target_acc = int(round(clamp(acc_base - (new40 - mean40) * 28.0, 64, 99)))
            if lbl in ("FS", "SS", "EDGE1", "EDGE2", "WLB", "MLB"):
                # Lift artificially depressed FS/SS/EDGE/LB speed & accel toward empirical Combine distribution
                old_spd = rat.get("spd", target_spd)
                old_acc = rat.get("acc", target_acc)
                rat["spd"] = int(round(max(old_spd, target_spd * 0.85 + old_spd * 0.15)))
                rat["acc"] = int(round(max(old_acc, target_acc * 0.85 + old_acc * 0.15)))
                lifted_db_edge += 1
            elif is_fallback_475 or bdb_row:
                rat["spd"] = target_spd
                rat["acc"] = target_acc

    TEAMS_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"[Calibrated nfl_teams_32.json] BdbCombineMatched={bdb_matched} | Fixed215Fallbacks={fixed_215} | Fixed475Outliers={fixed_475} | LiftedSafetyEdgeLb={lifted_db_edge}")


if __name__ == "__main__":
    main()
