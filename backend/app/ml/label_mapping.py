"""Beat Labeling Strategy and Annotation Mapping Module.

Defines the exact, documented mapping from raw MIT-BIH annotation symbols to
beat vs. non-beat categories and AAMI EC57 standard diagnostic classes.

No symbol is silently invented or guessed. All mappings are centralized here.
"""
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class AnnotationDefinition:
    symbol: str
    description: str
    is_beat: bool
    included: bool
    aami_class: Optional[str]
    reason: str


# Comprehensive dictionary of all known MIT-BIH / PhysioNet annotation symbols
ANNOTATION_REGISTRY: dict[str, AnnotationDefinition] = {
    # -------------------------------------------------------------------------
    # 1. Non-Ectopic / Normal Heartbeats (AAMI Class N)
    # -------------------------------------------------------------------------
    "N": AnnotationDefinition(
        symbol="N", description="Normal beat",
        is_beat=True, included=True, aami_class="N",
        reason="Normal sinus rhythm heartbeat; primary non-ectopic class."
    ),
    ".": AnnotationDefinition(
        symbol=".", description="Normal beat (alternate dot symbol)",
        is_beat=True, included=True, aami_class="N",
        reason="Equivalent to 'N' in WFDB plotter format; standard normal beat."
    ),
    "L": AnnotationDefinition(
        symbol="L", description="Left bundle branch block beat",
        is_beat=True, included=True, aami_class="N",
        reason="AAMI EC57 groups bundle branch block beats into non-ectopic class N."
    ),
    "R": AnnotationDefinition(
        symbol="R", description="Right bundle branch block beat",
        is_beat=True, included=True, aami_class="N",
        reason="AAMI EC57 groups bundle branch block beats into non-ectopic class N."
    ),
    "e": AnnotationDefinition(
        symbol="e", description="Atrial escape beat",
        is_beat=True, included=True, aami_class="N",
        reason="AAMI EC57 groups atrial escape beats into non-ectopic class N."
    ),
    "j": AnnotationDefinition(
        symbol="j", description="Nodal (junctional) escape beat",
        is_beat=True, included=True, aami_class="N",
        reason="AAMI EC57 groups nodal escape beats into non-ectopic class N."
    ),
    "B": AnnotationDefinition(
        symbol="B", description="Bundle branch block beat (unspecified)",
        is_beat=True, included=True, aami_class="N",
        reason="AAMI EC57 groups unspecified bundle branch block into class N."
    ),

    # -------------------------------------------------------------------------
    # 2. Supraventricular Ectopic Beats (AAMI Class S)
    # -------------------------------------------------------------------------
    "A": AnnotationDefinition(
        symbol="A", description="Atrial premature beat",
        is_beat=True, included=True, aami_class="S",
        reason="Premature atrial contraction (APC/APB); supraventricular ectopic class S."
    ),
    "a": AnnotationDefinition(
        symbol="a", description="Aberrated atrial premature beat",
        is_beat=True, included=True, aami_class="S",
        reason="Atrial premature beat conducted with aberrancy; supraventricular ectopic class S."
    ),
    "J": AnnotationDefinition(
        symbol="J", description="Nodal (junctional) premature beat",
        is_beat=True, included=True, aami_class="S",
        reason="Premature junctional contraction (PJC/NPB); supraventricular ectopic class S."
    ),
    "S": AnnotationDefinition(
        symbol="S", description="Supraventricular premature beat",
        is_beat=True, included=True, aami_class="S",
        reason="Supraventricular ectopic beat (unspecified focus); supraventricular ectopic class S."
    ),

    # -------------------------------------------------------------------------
    # 3. Ventricular Ectopic Beats (AAMI Class V)
    # -------------------------------------------------------------------------
    "V": AnnotationDefinition(
        symbol="V", description="Premature ventricular contraction",
        is_beat=True, included=True, aami_class="V",
        reason="Premature ventricular contraction (PVC/VPB); ventricular ectopic class V."
    ),
    "E": AnnotationDefinition(
        symbol="E", description="Ventricular escape beat",
        is_beat=True, included=True, aami_class="V",
        reason="Ventricular escape rhythm beat; ventricular ectopic class V."
    ),
    "r": AnnotationDefinition(
        symbol="r", description="R-on-T premature ventricular contraction",
        is_beat=True, included=True, aami_class="V",
        reason="PVC falling during the vulnerable repolarization phase; ventricular class V."
    ),

    # -------------------------------------------------------------------------
    # 4. Fusion Beats (AAMI Class F)
    # -------------------------------------------------------------------------
    "F": AnnotationDefinition(
        symbol="F", description="Fusion of ventricular and normal beat",
        is_beat=True, included=True, aami_class="F",
        reason="Simultaneous ventricular depolarization by normal conduction and ectopic focus; class F."
    ),

    # -------------------------------------------------------------------------
    # 5. Paced / Unknown / Unclassifiable Beats (AAMI Class Q)
    # -------------------------------------------------------------------------
    "/": AnnotationDefinition(
        symbol="/", description="Paced beat",
        is_beat=True, included=True, aami_class="Q",
        reason="Artificial pacemaker generated QRS complex; AAMI class Q."
    ),
    "P": AnnotationDefinition(
        symbol="P", description="Paced beat (alternate symbol)",
        is_beat=True, included=True, aami_class="Q",
        reason="Artificial pacemaker beat; AAMI class Q."
    ),
    "f": AnnotationDefinition(
        symbol="f", description="Fusion of paced and normal beat",
        is_beat=True, included=True, aami_class="Q",
        reason="Hybrid paced and intrinsic conduction QRS complex; AAMI class Q."
    ),
    "Q": AnnotationDefinition(
        symbol="Q", description="Unclassifiable beat",
        is_beat=True, included=True, aami_class="Q",
        reason="Beat obscured by artifact or unable to be identified; AAMI class Q."
    ),
    "?": AnnotationDefinition(
        symbol="?", description="Beat not classified during learning",
        is_beat=True, included=True, aami_class="Q",
        reason="Unclassified beat marker; AAMI class Q."
    ),

    # -------------------------------------------------------------------------
    # 6. Non-Beat Events & Markers (Excluded from Beat Dataset)
    # -------------------------------------------------------------------------
    "+": AnnotationDefinition(
        symbol="+", description="Rhythm change",
        is_beat=False, included=False, aami_class=None,
        reason="Rhythm segment boundary marker (e.g. (AFIB, (VT); not a discrete heartbeat."
    ),
    "[": AnnotationDefinition(
        symbol="[", description="Start of ventricular flutter/fibrillation",
        is_beat=False, included=False, aami_class=None,
        reason="Episode onset marker; not a discrete heartbeat."
    ),
    "!": AnnotationDefinition(
        symbol="!", description="Ventricular flutter wave",
        is_beat=False, included=False, aami_class=None,
        reason="Continuous sinusoidal wave peak in flutter episode; lacks distinct QRS morphology."
    ),
    "]": AnnotationDefinition(
        symbol="]", description="End of ventricular flutter/fibrillation",
        is_beat=False, included=False, aami_class=None,
        reason="Episode offset marker; not a discrete heartbeat."
    ),
    "~": AnnotationDefinition(
        symbol="~", description="Change in signal quality",
        is_beat=False, included=False, aami_class=None,
        reason="Noise or lead disconnect interval marker; not a heartbeat."
    ),
    "|": AnnotationDefinition(
        symbol="|", description="Isolated QRS-like artifact",
        is_beat=False, included=False, aami_class=None,
        reason="Non-cardiac electrical artifact mimicking QRS complex; not a true heartbeat."
    ),
    "x": AnnotationDefinition(
        symbol="x", description="Non-conducted P-wave (blocked APB)",
        is_beat=False, included=False, aami_class=None,
        reason="Atrial depolarization with blocked AV conduction; no corresponding ventricular beat."
    ),
    '"': AnnotationDefinition(
        symbol='"', description="Comment annotation",
        is_beat=False, included=False, aami_class=None,
        reason="Free-text clinical or technical comment."
    ),
    "^": AnnotationDefinition(
        symbol="^", description="Non-captured pacemaker artifact",
        is_beat=False, included=False, aami_class=None,
        reason="Pacemaker stimulus without cardiac response."
    ),
    "p": AnnotationDefinition(
        symbol="p", description="P-wave peak",
        is_beat=False, included=False, aami_class=None,
        reason="Sub-component wave fiducial point, not a full QRS beat."
    ),
    "t": AnnotationDefinition(
        symbol="t", description="T-wave peak",
        is_beat=False, included=False, aami_class=None,
        reason="Repolarization wave peak, not a QRS beat."
    ),
    "u": AnnotationDefinition(
        symbol="u", description="U-wave peak",
        is_beat=False, included=False, aami_class=None,
        reason="Minor wave component peak, not a QRS beat."
    ),
    "`": AnnotationDefinition(
        symbol="`", description="PQ junction",
        is_beat=False, included=False, aami_class=None,
        reason="Waveform boundary landmark."
    ),
    "'": AnnotationDefinition(
        symbol="'", description="J-point",
        is_beat=False, included=False, aami_class=None,
        reason="End of QRS complex landmark."
    ),
    "*": AnnotationDefinition(
        symbol="*", description="Systole",
        is_beat=False, included=False, aami_class=None,
        reason="Cardiac mechanical phase event marker."
    ),
    "D": AnnotationDefinition(
        symbol="D", description="Diastole",
        is_beat=False, included=False, aami_class=None,
        reason="Cardiac mechanical phase event marker."
    ),
    "=": AnnotationDefinition(
        symbol="=", description="Measurement annotation",
        is_beat=False, included=False, aami_class=None,
        reason="Technical calibration or measurement mark."
    ),
    "@": AnnotationDefinition(
        symbol="@", description="Link to external data",
        is_beat=False, included=False, aami_class=None,
        reason="External reference pointer."
    ),
}

# The 5 primary AAMI EC57 diagnostic classes
AAMI_CLASSES = ("N", "S", "V", "F", "Q")

AAMI_CLASS_DESCRIPTIONS = {
    "N": "Non-ectopic / Normal beats (Normal, LBBB, RBBB, Escape beats)",
    "S": "Supraventricular ectopic beats (APB, Aberrated APB, Junctional premature, SVEB)",
    "V": "Ventricular ectopic beats (PVC, Ventricular escape, R-on-T)",
    "F": "Fusion beats (Ventricular-normal fusion)",
    "Q": "Paced / Unclassifiable beats (Paced, Paced fusion, Unclassifiable)",
}


def get_annotation_def(symbol: str) -> Optional[AnnotationDefinition]:
    """Retrieve the formal definition for an annotation symbol."""
    return ANNOTATION_REGISTRY.get(symbol)


def is_heartbeat(symbol: str) -> bool:
    """Return True if the symbol designates an actual cardiac heartbeat."""
    definition = get_annotation_def(symbol)
    return bool(definition and definition.is_beat)


def is_included_beat(symbol: str) -> bool:
    """Return True if the symbol is a valid heartbeat designated for ML dataset inclusion."""
    definition = get_annotation_def(symbol)
    return bool(definition and definition.included and definition.aami_class is not None)


def get_aami_class(symbol: str) -> Optional[str]:
    """Return the AAMI EC57 class (N, S, V, F, Q) for a symbol, or None if non-beat/unsupported."""
    definition = get_annotation_def(symbol)
    return definition.aami_class if definition else None


def get_mapping_table() -> list[dict]:
    """Return the full mapping table as a list of dictionaries for reporting and documentation."""
    return [
        {
            "symbol": d.symbol,
            "description": d.description,
            "is_beat": d.is_beat,
            "included": d.included,
            "aami_class": d.aami_class or "N/A (Excluded)",
            "reason": d.reason,
        }
        for d in ANNOTATION_REGISTRY.values()
    ]
