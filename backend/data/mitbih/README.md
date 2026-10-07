# MIT-BIH Arrhythmia Database location

Place the **complete** MIT-BIH Arrhythmia Database here, **flat** (no subfolders), with the original file names:

```
backend/data/mitbih/
├── 100.hea   100.dat   100.atr
├── 101.hea   101.dat   101.atr
└── ...       (one set per record)
```

| Ext  | Meaning                         | Used by the app |
|------|---------------------------------|-----------------|
| .hea | WFDB header (metadata)          | Required        |
| .dat | Raw ECG signal                  | Required        |
| .atr | Reference beat annotations      | Optional (annotations are reported unavailable without it) |
| .xws | WAVE viewer workspace/settings  | Ignored         |

A record is discovered when `<id>.hea` and `<id>.dat` both exist. Do not rename files:
the `.hea` header refers to its `.dat` by name. The dataset itself is not shipped with this project.
