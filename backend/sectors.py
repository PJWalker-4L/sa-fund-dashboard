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

_THESIS_ROLES: dict[str, str] = {
    # Power Infrastructure
    "BE": "Power", "VST": "Power", "CEG": "Power", "NEE": "Power",
    "FSLR": "Power", "EQT": "Power", "NRG": "Power", "SEI": "Power",
    "LBRT": "Power", "PUMP": "Power", "PSIX": "Power", "BW": "Power",
    # GPU Silicon
    "INTC": "Silicon", "NVDA": "Silicon", "AMD": "Silicon",
    "AVGO": "Silicon", "QCOM": "Silicon", "MRVL": "Silicon",
    "MU": "Silicon", "TSEM": "Silicon",
    # GPU Cloud
    "CRWV": "GPU Cloud",
    # AI Infrastructure (data centers + miners converting to HPC)
    "CORZ": "AI Infrastructure", "IREN": "AI Infrastructure",
    "WULF": "AI Infrastructure", "CLSK": "AI Infrastructure",
    "APLD": "AI Infrastructure", "HUT": "AI Infrastructure", "WYFI": "AI Infrastructure",
    "RIOT": "AI Infrastructure", "CIFR": "AI Infrastructure",
    "BITF": "AI Infrastructure", "BTDR": "AI Infrastructure",
    # Optical Interconnects
    "LITE": "Optical", "COHR": "Optical",
    # Memory & Storage
    "WDC": "Storage", "STX": "Storage", "SNDK": "Storage",
}

_THESIS_PATTERNS: list[tuple[str, str]] = [
    ("bloom energy", "Power"), ("vistra", "Power"), ("constellation", "Power"),
    ("nextera", "Power"), ("first solar", "Power"), ("firstsolar", "Power"),
    ("nrg energy", "Power"), ("eqt corp", "Power"),
    ("intel", "Silicon"), ("nvidia", "Silicon"), ("broadcom", "Silicon"),
    ("advanced micro", "Silicon"), ("qualcomm", "Silicon"), ("marvell", "Silicon"),
    ("micron", "Silicon"),
    ("core scientific", "AI Infrastructure"), ("iren", "AI Infrastructure"),
    ("wulf", "AI Infrastructure"), ("cipher", "AI Infrastructure"),
    ("hut 8", "AI Infrastructure"), ("applied digital", "AI Infrastructure"),
    ("riot platforms", "AI Infrastructure"), ("bitfarms", "AI Infrastructure"),
    ("lumentum", "Optical"), ("coherent", "Optical"), ("ii-vi", "Optical"),
    ("western digital", "Storage"), ("seagate", "Storage"), ("sandisk", "Storage"),
    ("coreweave", "GPU Cloud"),
]


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


def thesis_role(ticker: str, issuer_name: str = "") -> str | None:
    if ticker:
        role = _THESIS_ROLES.get(ticker.upper())
        if role:
            return role
    name = issuer_name.lower()
    for pattern, role in _THESIS_PATTERNS:
        if pattern in name:
            return role
    return None
