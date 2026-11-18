"""
Builds empirical NFL calibration benchmarks (line play, coverage schemes,
NGS kinematics, and 8 historical opponent autopsy games) from downloaded
open-source nflverse CSV datasets (2022-2024).

Writes: src/data/nfl_empirical_benchmarks.json
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
NFLVERSE_DIR = ROOT / "data" / "nflverse"
OUT_PATH = ROOT / "src" / "data" / "nfl_empirical_benchmarks.json"

CANDIDATE_AUTOPSY_GAMES = [
    {"game_id": "2023_03_PHI_TB", "offense": "PHI", "defense": "TB", "label": "2023 Wk 3: PHI @ TB (Bowles 61% Blitz)"},
    {"game_id": "2023_07_SF_MIN", "offense": "SF", "defense": "MIN", "label": "2023 Wk 7: SF @ MIN (Flores Illusion-Fest)"},
    {"game_id": "2023_19_PHI_TB", "offense": "PHI", "defense": "TB", "label": "2023 WC: PHI @ TB (Bowles Playoff Collapse)"},
    {"game_id": "2023_21_KC_BAL", "offense": "BAL", "defense": "KC", "label": "2023 AFCCG: KC @ BAL (Spagnuolo 3rd-Down Clamp)"},
    {"game_id": "2024_03_HOU_MIN", "offense": "HOU", "defense": "MIN", "label": "2024 Wk 3: HOU @ MIN (Flores Double-Mug)"},
    {"game_id": "2024_04_PHI_TB", "offense": "PHI", "defense": "TB", "label": "2024 Wk 4: PHI @ TB (Bowles 6-Sack Sequel)"},
    {"game_id": "2024_19_MIN_LA", "offense": "MIN", "defense": "LA", "label": "2024 WC: MIN @ LA (Shula 9-Sack Sim Pressure)"},
    {"game_id": "2024_22_KC_PHI", "offense": "KC", "defense": "PHI", "label": "Super Bowl LIX: KC vs PHI (Fangio 4-Man Rush Cover 4)"},
]

COVERAGE_BUCKET_ORDER = [
    "COVER_0",
    "COVER_1",
    "COVER_2",
    "2_MAN",
    "COVER_3",
    "COVER_4",
    "COVER_6",
    "COVER_9",
    "COMBO",
]

ROUTE_BUCKET_ORDER = [
    "QUICK OUT",
    "HITCH/CURL",
    "SLANT",
    "SHALLOW CROSS/DRAG",
    "IN/DIG",
    "DEEP OUT",
    "CORNER",
    "POST",
    "GO",
    "SWING",
    "WHEEL",
    "TEXAS/ANGLE",
]


def safe_round(val: Any, digits: int = 4) -> float | None:
    if val is None or (isinstance(val, float) and (math.isnan(val) or math.isinf(val))):
        return None
    return round(float(val), digits)


def quantile_summary(series: pd.Series) -> dict[str, float | int | None]:
    s = pd.to_numeric(series, errors="coerce").dropna()
    if len(s) == 0:
        return {"n": 0, "mean": None, "std": None, "p10": None, "p25": None, "p50": None, "p75": None, "p90": None}
    q = np.quantile(s.to_numpy(dtype=float), [0.10, 0.25, 0.50, 0.75, 0.90])
    return {
        "n": int(len(s)),
        "mean": safe_round(s.mean(), 3),
        "std": safe_round(s.std(ddof=1) if len(s) > 1 else 0.0, 3),
        "p10": safe_round(q[0], 3),
        "p25": safe_round(q[1], 3),
        "p50": safe_round(q[2], 3),
        "p75": safe_round(q[3], 3),
        "p90": safe_round(q[4], 3),
    }


def summarize_dropbacks(df: pd.DataFrame) -> dict[str, Any]:
    n = int(len(df))
    if n == 0:
        return {"n": 0}
    pass_att = df[df["sack"] == 0]
    n_att = int(len(pass_att))
    rushers = pd.to_numeric(df["n_rushers"], errors="coerce")
    ttt = pd.to_numeric(df["time_to_throw"], errors="coerce")
    has_press = df["was_pressure"].notna()
    press_sub = df[has_press]
    comp_rate = (pass_att["complete_pass"] == 1).mean() * 100.0 if n_att > 0 else None
    int_att_rate = (pass_att["interception"] == 1).mean() * 100.0 if n_att > 0 else None
    int_db_rate = (df["interception"] == 1).mean() * 100.0
    sack_rate = (df["sack"] == 1).mean() * 100.0
    blitz_mask = pd.to_numeric(df["n_blitzers"], errors="coerce").fillna(0) >= 1
    blitz_alt = rushers.fillna(4) >= 5
    blitz_rate = (blitz_mask | blitz_alt).mean() * 100.0
    pressure_rate = (press_sub["was_pressure"] == True).mean() * 100.0 if len(press_sub) > 0 else None
    expl_rate = (df["yards_gained"] >= 15).mean() * 100.0
    succ_rate = (df["epa"] > 0).mean() * 100.0
    qb_fault_sacks = df[(df["sack"] == 1) & (df["is_qb_fault_sack"].notna())]
    qb_fault_pct = (qb_fault_sacks["is_qb_fault_sack"] == True).mean() * 100.0 if len(qb_fault_sacks) > 0 else None
    contested = df[df["is_contested_ball"].notna()]
    int_worthy = df[df["is_interception_worthy"].notna()]

    return {
        "n": n,
        "compPctOnAtt": safe_round(comp_rate, 2),
        "sackPct": safe_round(sack_rate, 2),
        "intPctOnAtt": safe_round(int_att_rate, 2),
        "intPctOnDb": safe_round(int_db_rate, 2),
        "pressurePct": safe_round(pressure_rate, 2),
        "blitzPct": safe_round(blitz_rate, 2),
        "explosive15Pct": safe_round(expl_rate, 2),
        "epaSuccessPct": safe_round(succ_rate, 2),
        "meanYardsPerDb": safe_round(df["yards_gained"].mean(), 2),
        "meanEpa": safe_round(df["epa"].mean(), 4),
        "meanAirYards": safe_round(pd.to_numeric(pass_att["air_yards"], errors="coerce").mean(), 2),
        "meanYacOnComp": safe_round(pd.to_numeric(pass_att[pass_att["complete_pass"] == 1]["yards_after_catch"], errors="coerce").mean(), 2),
        "qbFaultSackPct": safe_round(qb_fault_pct, 2),
        "contestedPct": safe_round((contested["is_contested_ball"] == True).mean() * 100.0, 2) if len(contested) else None,
        "intWorthyPct": safe_round((int_worthy["is_interception_worthy"] == True).mean() * 100.0, 2) if len(int_worthy) else None,
        "timeToThrow": quantile_summary(ttt),
        "meanPassRushers": safe_round(rushers.mean(), 2),
    }


def summarize_rushes(df: pd.DataFrame) -> dict[str, Any]:
    n = int(len(df))
    if n == 0:
        return {"n": 0}
    yds = pd.to_numeric(df["yards_gained"], errors="coerce").dropna()
    succ = ((yds >= 4) | (df["first_down"] == 1)).mean() * 100.0
    return {
        "n": n,
        "meanYards": safe_round(yds.mean(), 2),
        "medianYards": safe_round(yds.median(), 2),
        "stuffPct": safe_round((yds <= 0).mean() * 100.0, 2),
        "gainLt4Pct": safe_round(((yds > 0) & (yds < 4)).mean() * 100.0, 2),
        "successPct": safe_round(succ, 2),
        "explosive15Pct": safe_round((yds >= 15).mean() * 100.0, 2),
        "explosive10Pct": safe_round((yds >= 10).mean() * 100.0, 2),
        "meanEpa": safe_round(df["epa"].mean(), 4),
        "yardsQuantiles": quantile_summary(yds),
    }


def load_season_merged(year: int) -> pd.DataFrame:
    pbp_cols = [
        "game_id", "play_id", "season", "season_type", "week", "posteam", "defteam",
        "home_team", "away_team", "home_score", "away_score",
        "down", "ydstogo", "yardline_100", "qtr", "wp", "play_type", "qb_dropback",
        "pass_attempt", "rush_attempt", "sack", "qb_scramble", "complete_pass",
        "incomplete_pass", "interception", "yards_gained", "air_yards",
        "yards_after_catch", "epa", "first_down", "touchdown",
    ]
    pbp = pd.read_csv(NFLVERSE_DIR / f"play_by_play_{year}.csv.gz", usecols=pbp_cols, low_memory=False)
    part_cols = [
        "nflverse_game_id", "play_id", "offense_formation", "offense_personnel",
        "defenders_in_box", "defense_personnel", "number_of_pass_rushers",
        "ngs_air_yards", "time_to_throw", "was_pressure", "route",
        "defense_man_zone_type", "defense_coverage_type",
    ]
    part = pd.read_csv(NFLVERSE_DIR / f"pbp_participation_{year}.csv", usecols=part_cols, low_memory=False)
    ftn_cols = [
        "nflverse_game_id", "nflverse_play_id", "n_defense_box", "is_motion",
        "is_play_action", "is_screen_pass", "is_rpo", "is_qb_out_of_pocket",
        "is_interception_worthy", "is_contested_ball", "n_blitzers",
        "n_pass_rushers", "is_qb_fault_sack", "is_qb_sneak",
    ]
    ftn = pd.read_csv(NFLVERSE_DIR / f"ftn_charting_{year}.csv", usecols=ftn_cols, low_memory=False)

    merged = pbp.merge(
        part,
        left_on=["game_id", "play_id"],
        right_on=["nflverse_game_id", "play_id"],
        how="left",
    ).merge(
        ftn,
        left_on=["game_id", "play_id"],
        right_on=["nflverse_game_id", "nflverse_play_id"],
        how="left",
        suffixes=("", "_ftn"),
    )

    merged["n_rushers"] = pd.to_numeric(merged["number_of_pass_rushers"], errors="coerce").fillna(
        pd.to_numeric(merged["n_pass_rushers"], errors="coerce")
    )
    merged["box_count"] = pd.to_numeric(merged["defenders_in_box"], errors="coerce").fillna(
        pd.to_numeric(merged["n_defense_box"], errors="coerce")
    )
    return merged


def build_split_summary(df: pd.DataFrame) -> dict[str, Any]:
    # Filter clean competitive scrimmage plays (downs 1-4, exclude spikes/kneels/specials, avoid pure blowout <2%/>98% in Q4 if desired — keep standard neutral competitive or all valid scrimmage)
    valid = df[df["play_type"].isin(["pass", "run"]) & df["down"].isin([1, 2, 3, 4]) & df["epa"].notna()].copy()

    # Pass dropbacks (exclude explicit screens for core downfield pass/line model, keep total + non-screen)
    db_all = valid[valid["qb_dropback"] == 1].copy()
    db_no_scr = db_all[db_all["is_screen_pass"] != True].copy()
    db_pa = db_no_scr[db_no_scr["is_play_action"] == True]
    db_straight = db_no_scr[db_no_scr["is_play_action"] == False]

    rushers_num = pd.to_numeric(db_no_scr["n_rushers"], errors="coerce")
    blitzers_num = pd.to_numeric(db_no_scr["n_blitzers"], errors="coerce")
    is_blitz = (blitzers_num >= 1) | (rushers_num >= 5)
    db_4man = db_no_scr[(~is_blitz) & (rushers_num.notna() | blitzers_num.notna()) & (rushers_num.fillna(4) <= 4)]
    db_blitz = db_no_scr[is_blitz]

    # Designed rushes (exclude QB scrambles & sneaks when measuring RB run concepts, also include QB non-kneel runs overall)
    rushes_designed = valid[(valid["play_type"] == "run") & (valid["qb_dropback"] == 0) & (valid["is_qb_sneak"] != True)].copy()
    box = pd.to_numeric(rushes_designed["box_count"], errors="coerce")
    rushes_light = rushes_designed[box <= 6]
    rushes_normal = rushes_designed[box == 7]
    rushes_heavy = rushes_designed[box >= 8]

    # Coverage breakdown (non-screen dropbacks with charted coverage)
    cov_df = db_no_scr[db_no_scr["defense_coverage_type"].notna()].copy()
    cov_shares = cov_df["defense_coverage_type"].value_counts(normalize=True) * 100.0
    by_cov_type: dict[str, Any] = {}
    for cov in COVERAGE_BUCKET_ORDER:
        sub = cov_df[cov_df["defense_coverage_type"] == cov]
        if len(sub) > 0:
            summary = summarize_dropbacks(sub)
            summary["sharePct"] = safe_round(cov_shares.get(cov, 0.0), 2)
            by_cov_type[cov] = summary

    man_zone_df = db_no_scr[db_no_scr["defense_man_zone_type"].isin(["MAN_COVERAGE", "ZONE_COVERAGE"])]
    by_man_zone = {
        "MAN_COVERAGE": summarize_dropbacks(man_zone_df[man_zone_df["defense_man_zone_type"] == "MAN_COVERAGE"]),
        "ZONE_COVERAGE": summarize_dropbacks(man_zone_df[man_zone_df["defense_man_zone_type"] == "ZONE_COVERAGE"]),
    }

    # Route tree calibration across Man vs Zone
    by_route: dict[str, Any] = {}
    route_df = db_no_scr[db_no_scr["route"].notna()]
    for r in ROUTE_BUCKET_ORDER:
        sub = route_df[route_df["route"] == r]
        if len(sub) >= 30:
            by_route[r] = {
                "overall": summarize_dropbacks(sub),
                "man": summarize_dropbacks(sub[sub["defense_man_zone_type"] == "MAN_COVERAGE"]),
                "zone": summarize_dropbacks(sub[sub["defense_man_zone_type"] == "ZONE_COVERAGE"]),
            }

    # Situational splits
    third_long = db_all[(db_all["down"] == 3) & (db_all["ydstogo"] >= 7) & (db_all["ydstogo"] <= 11)]
    goal_line_4 = valid[(valid["yardline_100"] <= 5)]

    return {
        "dropbacks": {
            "allDropbacks": summarize_dropbacks(db_all),
            "nonScreenDropbacks": summarize_dropbacks(db_no_scr),
            "straightDropback": summarize_dropbacks(db_straight),
            "playAction": summarize_dropbacks(db_pa),
            "fourManOrFewerRush": summarize_dropbacks(db_4man),
            "blitz5Plus": summarize_dropbacks(db_blitz),
            "thirdAndLong_7to11": summarize_dropbacks(third_long),
        },
        "rushes": {
            "allDesignedRushes": summarize_rushes(rushes_designed),
            "lightBox_le6": summarize_rushes(rushes_light),
            "normalBox_7": summarize_rushes(rushes_normal),
            "heavyBox_ge8": summarize_rushes(rushes_heavy),
        },
        "coverage": {
            "manVsZone": by_man_zone,
            "byCoverageType": by_cov_type,
        },
        "byRoute": by_route,
        "goalLineLe5Yd": {
            "totalPlays": int(len(goal_line_4)),
            "tdRatePct": safe_round((goal_line_4["touchdown"] == 1).mean() * 100.0, 2) if len(goal_line_4) else None,
            "meanEpa": safe_round(goal_line_4["epa"].mean(), 4) if len(goal_line_4) else None,
        },
    }


def build_ngs_kinematic_summary() -> dict[str, Any]:
    pass_dfs = [pd.read_csv(NFLVERSE_DIR / f"ngs_{y}_passing.csv.gz") for y in (2022, 2023)]
    rec_dfs = [pd.read_csv(NFLVERSE_DIR / f"ngs_{y}_receiving.csv.gz") for y in (2022, 2023)]
    rush_dfs = [pd.read_csv(NFLVERSE_DIR / f"ngs_{y}_rushing.csv.gz") for y in (2022, 2023)]

    pass_df = pd.concat(pass_dfs, ignore_index=True)
    rec_df = pd.concat(rec_dfs, ignore_index=True)
    rush_df = pd.concat(rush_dfs, ignore_index=True)

    # week == 0 is full season summary in nflverse NGS CSVs; week > 0 is per-game
    pass_wk = pass_df[pass_df["week"] > 0]
    rec_wk = rec_df[rec_df["week"] > 0]
    rush_wk = rush_df[rush_df["week"] > 0]

    # Team 2023 season offensive NGS averages
    rec_23_szn = rec_df[(rec_df["season"] == 2023) & (rec_df["week"] == 0)]
    pass_23_szn = pass_df[(pass_df["season"] == 2023) & (pass_df["week"] == 0)]
    rush_23_szn = rush_df[(rush_df["season"] == 2023) & (rush_df["week"] == 0)]

    team_profiles: dict[str, Any] = {}
    for team in sorted(set(pass_23_szn["team_abbr"].dropna()) | set(rec_23_szn["team_abbr"].dropna())):
        p_t = pass_23_szn[pass_23_szn["team_abbr"] == team].sort_values("attempts", ascending=False)
        r_t = rec_23_szn[rec_23_szn["team_abbr"] == team].sort_values("targets", ascending=False)
        ru_t = rush_23_szn[rush_23_szn["team_abbr"] == team].sort_values("rush_attempts", ascending=False)
        team_profiles[str(team)] = {
            "qbTimeToThrow": safe_round(p_t["avg_time_to_throw"].iloc[0], 3) if len(p_t) else None,
            "qbCpoe": safe_round(p_t["completion_percentage_above_expectation"].iloc[0], 2) if len(p_t) else None,
            "wrAvgSeparation": safe_round(
                np.average(r_t["avg_separation"], weights=np.maximum(1, r_t["targets"])), 3
            ) if len(r_t) else None,
            "wrAvgCushion": safe_round(
                np.average(r_t["avg_cushion"], weights=np.maximum(1, r_t["targets"])), 3
            ) if len(r_t) else None,
            "wrAvgYacAboveExp": safe_round(
                np.average(r_t["avg_yac_above_expectation"], weights=np.maximum(1, r_t["targets"])), 3
            ) if len(r_t) else None,
            "rbAvgTimeToLos": safe_round(ru_t["avg_time_to_los"].iloc[0], 3) if len(ru_t) else None,
            "rbRyoePerAtt": safe_round(ru_t["rush_yards_over_expected_per_att"].iloc[0], 3) if len(ru_t) else None,
        }

    return {
        "passingWeekly": {
            "avgTimeToThrow": quantile_summary(pass_wk["avg_time_to_throw"]),
            "avgIntendedAirYards": quantile_summary(pass_wk["avg_intended_air_yards"]),
            "aggressivenessPct": quantile_summary(pass_wk["aggressiveness"]),
        },
        "receivingWeekly": {
            "avgSeparationYds": quantile_summary(rec_wk["avg_separation"]),
            "avgCushionYds": quantile_summary(rec_wk["avg_cushion"]),
            "avgYacYds": quantile_summary(rec_wk["avg_yac"]),
        },
        "rushingWeekly": {
            "avgTimeToLosSec": quantile_summary(rush_wk["avg_time_to_los"]),
            "efficiency": quantile_summary(rush_wk["efficiency"]),
            "avgRushYards": quantile_summary(rush_wk["avg_rush_yards"]),
        },
        "team2023Profiles": team_profiles,
    }


def build_autopsy_games(df_all: pd.DataFrame) -> list[dict[str, Any]]:
    out = []
    for meta in CANDIDATE_AUTOPSY_GAMES:
        g = df_all[
            (df_all["game_id"] == meta["game_id"])
            & (df_all["posteam"] == meta["offense"])
            & (df_all["play_type"].isin(["pass", "run"]))
            & (df_all["down"].isin([1, 2, 3, 4]))
            & (df_all["epa"].notna())
        ].copy()
        if len(g) == 0:
            continue
        first_row = g.iloc[0]
        off_is_home = first_row["home_team"] == meta["offense"]
        off_score = int(first_row["home_score"] if off_is_home else first_row["away_score"])
        def_score = int(first_row["away_score"] if off_is_home else first_row["home_score"])

        db = g[g["qb_dropback"] == 1].copy()
        db_ns = db[db["is_screen_pass"] != True]
        rushes = g[(g["play_type"] == "run") & (g["qb_dropback"] == 0)]

        rushers = pd.to_numeric(db_ns["n_rushers"], errors="coerce")
        blitzers = pd.to_numeric(db_ns["n_blitzers"], errors="coerce")
        is_blitz = (blitzers >= 1) | (rushers >= 5)

        cov_counts = db_ns["defense_coverage_type"].value_counts().to_dict()
        out.append({
            "gameId": meta["game_id"],
            "label": meta["label"],
            "offense": meta["offense"],
            "defense": meta["defense"],
            "finalScore": f"{meta['offense']} {off_score}, {meta['defense']} {def_score}",
            "dropbacksAll": summarize_dropbacks(db),
            "dropbacksVsBlitz": summarize_dropbacks(db_ns[is_blitz]),
            "dropbacksVsNonBlitz": summarize_dropbacks(db_ns[~is_blitz]),
            "designedRushes": summarize_rushes(rushes),
            "coverageCounts": {str(k): int(v) for k, v in cov_counts.items()},
        })
    return out


def main() -> None:
    print("Loading nflverse 2022, 2023, 2024 seasons...")
    df22 = load_season_merged(2022)
    df23 = load_season_merged(2023)
    df24 = load_season_merged(2024)

    train_df = pd.concat([df22, df23], ignore_index=True)
    heldout_df = df24
    all_df = pd.concat([df22, df23, df24], ignore_index=True)

    payload = {
        "metadata": {
            "trainSeasons": [2022, 2023],
            "heldOutSeason": [2024],
            "sources": [
                "nflverse play_by_play (2022-2024)",
                "nflverse pbp_participation (2022-2024)",
                "nflverse ftn_charting (2022-2024, CC-BY-SA 4.0)",
                "nflverse nextgen_stats (2022-2023)",
            ],
        },
        "train_2022_2023": build_split_summary(train_df),
        "heldOut_2024": build_split_summary(heldout_df),
        "ngsKinematics_2022_2023": build_ngs_kinematic_summary(),
        "autopsyGames": build_autopsy_games(all_df),
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size / 1024:.1f} KB)")

    tr_db = payload["train_2022_2023"]["dropbacks"]
    tr_cov = payload["train_2022_2023"]["coverage"]["manVsZone"]
    tr_ru = payload["train_2022_2023"]["rushes"]
    print(
        f"Train 2022-2023 Non-Screen DB (N={tr_db['nonScreenDropbacks']['n']}): "
        f"Comp={tr_db['nonScreenDropbacks']['compPctOnAtt']}%, "
        f"Sack={tr_db['nonScreenDropbacks']['sackPct']}%, "
        f"Press={tr_db['nonScreenDropbacks']['pressurePct']}%, "
        f"INT/Att={tr_db['nonScreenDropbacks']['intPctOnAtt']}%, "
        f"TTT={tr_db['nonScreenDropbacks']['timeToThrow']['mean']}s, "
        f"EPA={tr_db['nonScreenDropbacks']['meanEpa']}"
    )
    print(
        f"  Blitz vs 4-Man: Sack {tr_db['blitz5Plus']['sackPct']}% vs {tr_db['fourManOrFewerRush']['sackPct']}% | "
        f"Press {tr_db['blitz5Plus']['pressurePct']}% vs {tr_db['fourManOrFewerRush']['pressurePct']}%"
    )
    print(
        f"  Man vs Zone: Comp {tr_cov['MAN_COVERAGE']['compPctOnAtt']}% vs {tr_cov['ZONE_COVERAGE']['compPctOnAtt']}% | "
        f"INT/Att {tr_cov['MAN_COVERAGE']['intPctOnAtt']}% vs {tr_cov['ZONE_COVERAGE']['intPctOnAtt']}% | "
        f"Sack {tr_cov['MAN_COVERAGE']['sackPct']}% vs {tr_cov['ZONE_COVERAGE']['sackPct']}%"
    )
    print(
        f"  Designed Rushes (N={tr_ru['allDesignedRushes']['n']}): "
        f"YPC={tr_ru['allDesignedRushes']['meanYards']}y, "
        f"Stuff={tr_ru['allDesignedRushes']['stuffPct']}%, "
        f"Expl15={tr_ru['allDesignedRushes']['explosive15Pct']}%, "
        f"EPA={tr_ru['allDesignedRushes']['meanEpa']}"
    )


if __name__ == "__main__":
    main()
