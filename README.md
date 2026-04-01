# 🌿 Assessing Urban Reforestation Impact in Medellín via Earth Observation

> **Land Cover Classification and Change Detection of the Medellín Green Corridors using Sentinel-2 imagery, Random Forest, and Support Vector Machine.**

---

## 📌 Project Overview

Medellín (Colombia) launched an ambitious urban reforestation programme known as the **Corredores Verdes** (Green Corridors), transforming major arterial roads into green linear parks.  This project uses multi-temporal **Sentinel-2** satellite imagery and **Landsat-8** thermal data to quantify the land cover and temperature changes attributable to the intervention.

| Topic | Detail |
|---|---|
| Study area | Medellín metropolitan area, Colombia |
| Satellite | Sentinel-2 MSI (Level-2A) + Landsat-8 OLI/TIRS |
| Classification | Binary – Vegetation vs. Non-Vegetation |
| Models | Random Forest (RF) · Support Vector Machine (SVM) |
| Time periods | Before corridors · After corridors |
| Generalization test | Bogotá (independent city) |

---

## 🗂️ Repository Structure

```
medellin-green-corridors/
│
├── README.md
├── LICENSE
├── .gitignore
├── requirements.txt
│
├── scripts/
│   ├── land_cover_classification.py   # Main Python pipeline (ML + change detection)
│   └── gee_data_export.js             # Google Earth Engine data preparation script
│
├── data/
│   ├── raw/           # Input data (see Data section below)
│   └── processed/     # Intermediate vector layers (corridors, AOI)
│
├── outputs/
│   └── figures/       # Maps, charts and visualisations
│
└── docs/
    ├── article.pdf         # Full paper
    └── presentation.pdf    # Slide deck
```

---

## ⚙️ Methodology

```
Sentinel-2 (GEE)          Landsat-8 (GEE)
      │                         │
      ▼                         ▼
  Spectral bands           Band 10 (TIR)
  Indices (NDVI…)               │
  Terrain (DEM)          ┌──────┘
  Texture (GLCM)         │
      │                  │
      ▼                  │
  Outlier removal        │
  (Z-score, σ=4)         │
      │                  │
      ▼                  │
  Sequential Feature     │
  Selection (SFS/SBE)    │
      │                  │
      ▼                  │
  Spatial sampling       │
  (min-distance 400 m)   │
      │                  │
      ▼                  │
  RF / SVM               │
  GridSearchCV           │
  5-fold StratifiedCV    │
      │                  │
      ├─────────────────►│
      │                  ▼
      │         Thermal change (LST)
      │         Before vs. After
      ▼
  Full-image classification
  Before / After
      │
      ▼
  Land cover change detection
  (city-wide + inside corridors)
```

### Feature Set

| Category | Features |
|---|---|
| Spectral bands | B2, B3, B4, B8, B11, B12 |
| Spectral indices | NDVI, EVI, SAVI, NDBI |
| Terrain | Elevation, Slope, Aspect |
| Texture (GLCM) | Contrast, Entropy |

---

## 🚀 Getting Started

### Prerequisites

- Python ≥ 3.10
- A [Google Earth Engine](https://earthengine.google.com/) account (for data export)

### Installation

```bash
git clone https://github.com/<your-username>/medellin-green-corridors.git
cd medellin-green-corridors
pip install -r requirements.txt
```

### Data

Large raster files are **not** stored in this repository.  To reproduce the analysis:

1. Run `scripts/gee_data_export.js` in the [GEE Code Editor](https://code.earthengine.google.com/) to export Sentinel-2 and Landsat-8 composites to your Google Drive.
2. Download the exported TIFFs and place them in `data/raw/`.
3. Place the corridor and AOI shapefiles (`corridors_clippedAOI.gpkg`, `aoi.shp`) in `data/processed/`.

Expected input files in `data/raw/`:

```
Medellin_Training_Optimal.csv
Bogota_Test_Optimal.csv
S2_Medellin_Texture_before.tif
S2_Medellin_Texture_20.tif
S2_Medellin_Texture_after.tif
dem_medellin.tif
thermal_Before.tif
thermal_After.tif
```

### Run

```bash
python scripts/land_cover_classification.py
```

Output maps and figures will be saved to `outputs/figures/`.

---

## 📊 Key Results

| Metric | Value |
|---|---|
| SVM Cross-Val Accuracy (Medellín) | — |
| SVM Accuracy on Bogotá (generalization) | — |
| Vegetation gain (city-wide, before→after) | — km² |
| Vegetation gain inside corridors | — km² |
| Mean LST change (city-wide) | — °C |

*Results will be filled in after running the pipeline.*

---

## 🛠️ Tech Stack

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.3%2B-orange)
![Google Earth Engine](https://img.shields.io/badge/Google%20Earth%20Engine-JavaScript-4285F4)
![rasterio](https://img.shields.io/badge/rasterio-1.3%2B-green)
![geopandas](https://img.shields.io/badge/geopandas-0.14%2B-yellowgreen)

---

## 📄 Citation

If you use this code or methodology, please cite the accompanying article:

> [Author(s)]. *Assessing the Impact of Urban Reforestation on Land Cover and Land Surface Temperature in Medellín, Colombia*. [Journal/Conference], [Year].

---

## 📬 Contact

Feel free to open an issue or reach out if you have questions about the methodology or data.

---

## 📝 License

This project is released under the [MIT License](LICENSE).
