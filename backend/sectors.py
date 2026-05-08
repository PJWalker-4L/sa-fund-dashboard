"""
Bucket classification for SA Fund holdings.
Uses case-insensitive substring matching on nameOfIssuer.
"""

_PATTERNS: list[tuple[str, str]] = [
    # Compute / Semiconductors
    ("intel", "Compute"),
    ("nvidia", "Compute"),
    ("advanced micro", "Compute"),
    ("broadcom", "Compute"),
    ("qualcomm", "Compute"),
    ("marvell", "Compute"),
    ("micron", "Compute"),
    ("arm hold", "Compute"),
    # Power & Energy
    ("bloom energy", "Power"),
    ("firstsolar", "Power"),
    ("first solar", "Power"),
    ("nextera", "Power"),
    ("vistra", "Power"),
    ("constellation", "Power"),
    ("nrg energy", "Power"),
    ("sievert", "Power"),
    ("solar", "Power"),
    # AI Infrastructure
    ("applied digital", "AI Infra"),
    ("core scientific", "AI Infra"),
    ("iren", "AI Infra"),
    ("wulf", "AI Infra"),
    ("bit digital", "AI Infra"),
    ("hut 8", "AI Infra"),
    ("cipher", "AI Infra"),
    # Optical / Networking
    ("lumentum", "Optical"),
    ("coherent", "Optical"),
    ("ii-vi", "Optical"),
    ("ciena", "Optical"),
    # Storage / Memory
    ("western digital", "Storage"),
    ("seagate", "Storage"),
    # Miners → AI / Bitcoin
    ("microstrategy", "Bitcoin/AI"),
    ("riot", "Bitcoin/AI"),
    ("cleanspark", "Bitcoin/AI"),
    ("marathon", "Bitcoin/AI"),
]

_TICKER_MAP: dict[str, str] = {
    # Compute / Semiconductors
    "INTC": "Compute", "NVDA": "Compute", "AMD": "Compute",
    "AVGO": "Compute", "QCOM": "Compute", "MRVL": "Compute", "MU": "Compute",
    "TSEM": "Compute",
    # Power & Energy
    "BE": "Power", "FSLR": "Power", "NEE": "Power", "VST": "Power",
    "CEG": "Power", "NRG": "Power", "EQT": "Power", "SEI": "Power",
    "LBRT": "Power", "PUMP": "Power", "PSIX": "Power", "BW": "Power",
    # AI Infrastructure / Data Centers
    "APLD": "AI Infra", "CORZ": "AI Infra", "IREN": "AI Infra",
    "WULF": "AI Infra", "CLSK": "AI Infra", "HUT": "AI Infra",
    "CRWV": "AI Infra", "WYFI": "AI Infra",
    # Optical / Networking
    "LITE": "Optical", "COHR": "Optical",
    # Storage
    "WDC": "Storage", "STX": "Storage", "SNDK": "Storage",
    # Bitcoin / Miners → AI
    "MSTR": "Bitcoin/AI", "RIOT": "Bitcoin/AI", "CIFR": "Bitcoin/AI",
    "BTDR": "Bitcoin/AI", "BITF": "Bitcoin/AI",
}

_DEFAULT = "Other"


def classify(ticker: str, issuer_name: str = "") -> str:
    if ticker:
        bucket = _TICKER_MAP.get(ticker.upper())
        if bucket:
            return bucket
    name = issuer_name.lower()
    for pattern, bucket in _PATTERNS:
        if pattern in name:
            return bucket
    return _DEFAULT
