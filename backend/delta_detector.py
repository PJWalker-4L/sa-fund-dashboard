import pandas as pd
from typing import Optional


def _key(row: dict) -> str:
    return f"{row.get('cusip', '')}_{row.get('putCall') or 'SHARE'}"


def compute_delta(
    current: pd.DataFrame,
    previous: Optional[pd.DataFrame],
) -> dict:
    """
    Compare current holdings vs previous quarter.
    Returns dict with keys: new, closed, increased, decreased, unchanged.
    Each value is a list of position dicts with status + change metrics attached.
    """
    empty = {"new": [], "closed": [], "increased": [], "decreased": [], "unchanged": []}
    if previous is None or previous.empty:
        return empty

    curr_records = current.to_dict(orient="records")
    prev_records = previous.to_dict(orient="records")

    curr_map = {_key(r): r for r in curr_records}
    prev_map = {_key(r): r for r in prev_records}

    curr_keys = set(curr_map)
    prev_keys = set(prev_map)

    result: dict[str, list] = {"new": [], "closed": [], "increased": [], "decreased": [], "unchanged": []}

    for k in curr_keys - prev_keys:
        row = {**curr_map[k], "status": "NEW",
               "value_change": float(curr_map[k].get("value") or 0),
               "shares_change": float(curr_map[k].get("sshPrnamt") or 0),
               "pct_change": None}
        result["new"].append(row)

    for k in prev_keys - curr_keys:
        row = {**prev_map[k], "status": "CLOSED",
               "value_change": -float(prev_map[k].get("value") or 0),
               "shares_change": -float(prev_map[k].get("sshPrnamt") or 0),
               "pct_change": -100.0}
        result["closed"].append(row)

    for k in curr_keys & prev_keys:
        c, p = curr_map[k], prev_map[k]
        c_sh = float(c.get("sshPrnamt") or 0)
        p_sh = float(p.get("sshPrnamt") or 0)
        c_val = float(c.get("value") or 0)
        p_val = float(p.get("value") or 0)
        sh_delta = c_sh - p_sh
        val_delta = c_val - p_val
        pct = round(((c_sh / p_sh) - 1) * 100, 2) if p_sh else 0.0

        row = {**c, "value_change": val_delta, "shares_change": sh_delta, "pct_change": pct}

        if abs(pct) < 0.5:
            row["status"] = "UNCHANGED"
            result["unchanged"].append(row)
        elif c_sh > p_sh:
            row["status"] = "INCREASED"
            result["increased"].append(row)
        else:
            row["status"] = "DECREASED"
            result["decreased"].append(row)

    return result
