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
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEAMS_PATH = ROOT / "src" / "data" / "nfl_teams_32.json"

# (mean_40, sd_spread, min_40, max_40, spd_base, acc_base)
POS_PHYSICAL_ENVELOPE = {
    "QB":    (4.78, 0.16, 4.42, 5.08, 79, 80),
    "RB":    (4.46, 0.08, 4.30, 4.62, 89, 90),
    "WR1":   (4.41, 0.08, 4.24, 4.58, 92, 92),
    "WR2":   (4.44, 0.08, 4.28, 4.62, 91, 91),
    "SLOT":  (4.45, 0.08, 4.28, 4.62, 91, 91),
    "TE":    (4.64, 0.10, 4.44, 4.86, 83, 83),
    "LT":    (5.05, 0.12, 4.82, 5.32, 72, 72),
    "RT":    (5.08, 0.12, 4.84, 5.34, 71, 72),
    "LG":    (5.12, 0.11, 4.88, 5.38, 70, 70),
    "C":     (5.09, 0.11, 4.86, 5.36, 71, 71),
    "RG":    (5.12, 0.11, 4.88, 5.38, 70, 70),
    "EDGE1": (4.62, 0.10, 4.42, 4.84, 84, 85),
    "EDGE2": (4.63, 0.10, 4.42, 4.86, 84, 85),
    "DT1":   (4.98, 0.12, 4.78, 5.26, 73, 74),
    "DT2":   (4.96, 0.12, 4.76, 5.24, 74, 75),
    "WLB":   (4.56, 0.09, 4.38, 4.74, 85, 86),
    "MLB":   (4.59, 0.09, 4.42, 4.78, 84, 85),
    "CB1":   (4.41, 0.08, 4.26, 4.58, 92, 91),
    "CB2":   (4.42, 0.08, 4.28, 4.59, 92, 92),
    "NB":    (4.44, 0.08, 4.28, 4.60, 91, 91),
    "FS":    (4.48, 0.08, 4.32, 4.66, 88, 88),
    "SS":    (4.51, 0.08, 4.36, 4.69, 87, 87),
}


def deterministic_unit(seed_str: str) -> float:
    h = hashlib.sha256(seed_str.encode("utf-8")).digest()
    val = int.from_bytes(h[:4], "big") / 0xFFFFFFFF
    return val * 2.0 - 1.0  # [-1, +1]


def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def main() -> None:
    data = json.loads(TEAMS_PATH.read_text(encoding="utf-8"))
    fixed_475 = 0
    lifted_db_edge = 0

    for team_code, team in data.items():
        for p in team["offense"] + team["defense"]:
            lbl = p.get("label", "")
            if lbl not in POS_PHYSICAL_ENVELOPE:
                continue
            mean40, sd40, lo40, hi40, spd_base, acc_base = POS_PHYSICAL_ENVELOPE[lbl]
            sc = p.setdefault("scouting", {})
            rat = p.setdefault("ratings", {})
            wt = sc.get("weightLbs", 220)
            old40 = sc.get("fortyYdDash")

            u = deterministic_unit(f"{team_code}:{p.get('name','')}:{lbl}")
            # Weight adjustment relative to positional norm keeps 340-lb NT slower than 290-lb 3T
            wt_adj = 0.0
            if lbl in ("LT", "RT", "LG", "C", "RG", "DT1", "DT2"):
                wt_adj = (wt - 308.0) * 0.0025
            elif lbl in ("EDGE1", "EDGE2"):
                wt_adj = (wt - 258.0) * 0.0020

            is_fallback_475 = old40 is not None and abs(old40 - 4.75) < 0.005
            if is_fallback_475 and lbl not in ("QB",):
                # Imputed 4.75 fallback -> assign realistic combine envelope from weight & rating
                ovr_adj = -((sc.get("ovr", 80) - 82.0) * 0.006)
                new40 = clamp(mean40 + wt_adj + ovr_adj + u * sd40 * 0.65, lo40, hi40)
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
            # 10-yd split tracks linear burst (~34.5% of 40 + position mass factor)
            mass_split = 0.12 if lbl in ("LT", "RT", "LG", "C", "RG", "DT1", "DT2") else 0.06 if lbl in ("EDGE1", "EDGE2", "TE") else 0.03
            new_10y = f"{clamp(new40 * 0.325 + mass_split, 1.44, 1.86):.2f}"

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
            elif is_fallback_475:
                rat["spd"] = target_spd
                rat["acc"] = target_acc

    TEAMS_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"[Calibrated nfl_teams_32.json] Fixed475Outliers={fixed_475} | LiftedSafetyEdgeLb={lifted_db_edge}")


if __name__ == "__main__":
    main()
