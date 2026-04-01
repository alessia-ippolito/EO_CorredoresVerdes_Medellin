# =============================================================================
# Land Cover Classification – Medellín Green Corridors
# =============================================================================
# Project : Urban reforestation impact assessment in Medellín, Colombia
# Study area : Medellín city extent + Green Corridors (Corredores Verdes)
# Satellite  : Sentinel-2 (MSI, Level-2A)
# Labels     : Binary – 0 = Non-Vegetation, 1 = Vegetation
# Models     : Random Forest (RF) and Support Vector Machine (SVM)
# Workflow   :
#   1. Data loading & exploratory analysis
#   2. Outlier detection and removal (Z-score)
#   3. Feature correlation analysis
#   4. Sequential Feature Selection (forward + backward) for RF and SVM
#   5. Spatial sampling strategies to reduce autocorrelation
#   6. Hyperparameter tuning via GridSearchCV
#   7. Cross-validated model evaluation (accuracy, F1, AUC-ROC)
#   8. Generalization test on Bogotá (independent city)
#   9. Full-image classification for three time periods (before / 2020 / after)
#  10. Land-cover change detection inside the green corridors
#  11. Thermal (LST) change analysis using Landsat-8 Band 10
# =============================================================================

# ── Imports ──────────────────────────────────────────────────────────────────
import os
import sys
import warnings

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.colors as colors
import seaborn as sns
import geopandas as gpd
from shapely.geometry import mapping
from scipy import stats
from scipy.spatial import distance_matrix
from scipy.spatial.distance import cdist
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.model_selection import (
    train_test_split, cross_val_score, cross_val_predict,
    StratifiedKFold, GridSearchCV
)
from sklearn.cluster import KMeans
from sklearn.metrics import (
    confusion_matrix, classification_report, accuracy_score,
    roc_auc_score, roc_curve
)
from mlxtend.feature_selection import SequentialFeatureSelector as SFS
import rasterio
import rasterio.mask
from rasterio.features import rasterize
from rasterio.warp import calculate_default_transform, reproject, Resampling
from matplotlib_scalebar.scalebar import ScaleBar
from tqdm import tqdm

warnings.filterwarnings("ignore")

# ── Global plot style ─────────────────────────────────────────────────────────
plt.style.use("seaborn-v0_8-darkgrid")
sns.set_palette("husl")

# =============================================================================
# 1. DATA LOADING
# =============================================================================

# Training data exported from Google Earth Engine (see scripts/gee_export.js)
df = pd.read_csv("data/Medellin_Training_Optimal.csv")
df["ID"] = df.index + 1
df_coordinates_Medellin = df[["ID", "latitude", "longitude"]]

print("=" * 80)
print("DATASET OVERVIEW")
print("=" * 80)
print(f"Shape           : {df.shape}")
print(f"\nClass distribution:\n{df['LC'].value_counts()}")
print(f"\nClass percentages:\n{df['LC'].value_counts(normalize=True) * 100:.2f}")

# =============================================================================
# 2. OUTLIER DETECTION AND REMOVAL
# =============================================================================

# Sentinel-2 spectral bands + spectral indices + terrain + texture features
feature_cols = [
    "B2", "B3", "B4", "B8", "B11", "B12",
    "NDVI", "EVI", "SAVI", "NDBI",
    "elevation", "slope", "aspect",
    "texture_contrast", "texture_entropy"
]


def detect_outliers_zscore(df: pd.DataFrame, features: list, threshold: float = 3) -> pd.Series:
    """
    Detect outliers using the Z-score method.

    Parameters
    ----------
    df        : Input DataFrame
    features  : List of feature column names to evaluate
    threshold : Z-score threshold above which a sample is flagged (default: 3)

    Returns
    -------
    Boolean Series – True where at least one feature exceeds the threshold
    """
    z_scores = np.abs(stats.zscore(df[features]))
    return (z_scores > threshold).any(axis=1)


# Z-score with threshold=4 is more conservative – preferred for remote sensing data
outliers_z = detect_outliers_zscore(df, feature_cols, threshold=4)
print(f"\nOutliers detected (Z-score, threshold=4): {outliers_z.sum()} "
      f"({outliers_z.sum() / len(df) * 100:.2f}%)")

REMOVE_OUTLIERS = True  # Set to False to keep outliers
df_clean = df[~outliers_z] if REMOVE_OUTLIERS else df.copy()
print(f"Dataset shape after outlier removal: {df_clean.shape}")

# =============================================================================
# 3. CORRELATION ANALYSIS
# =============================================================================

correlation_matrix = df_clean[feature_cols].corr()

fig, ax = plt.subplots(figsize=(16, 14))
sns.heatmap(
    correlation_matrix, annot=True, fmt=".2f", cmap="coolwarm",
    center=0, square=True, linewidths=0.5,
    cbar_kws={"shrink": 0.8}, annot_kws={"size": 8}
)
plt.title("Correlation Matrix – All Features", fontsize=16, pad=20)
plt.tight_layout()
plt.savefig("outputs/figures/correlation_heatmap.png", dpi=300, bbox_inches="tight")
plt.show()

# Remove redundant features (|r| > 0.8):
# B3, B4 → correlated with B2; B8A, EVI, SAVI → correlated with NDVI; B12 → correlated with B11
feature_cols_corrected = [
    "B2", "B8", "B11",
    "NDVI", "NDBI",
    "elevation", "slope", "aspect",
    "texture_contrast", "texture_entropy"
]

# =============================================================================
# 4. SPATIAL SAMPLING – mitigate spatial autocorrelation
# =============================================================================

def grid_based_sampling(df: pd.DataFrame, grid_size: int = 20,
                        samples_per_cell: int = 1,
                        balance_classes: bool = True) -> pd.DataFrame:
    """
    Divide the study area into a regular grid and draw a spatially balanced
    sample from each cell.

    Parameters
    ----------
    grid_size       : Number of cells per side
    samples_per_cell: Maximum samples per class per cell
    balance_classes : If True, sample each class equally within each cell
    """
    lon_bins = np.linspace(df["longitude"].min(), df["longitude"].max(), grid_size + 1)
    lat_bins = np.linspace(df["latitude"].min(), df["latitude"].max(), grid_size + 1)
    df["lon_bin"] = pd.cut(df["longitude"], bins=lon_bins, labels=False, include_lowest=True)
    df["lat_bin"] = pd.cut(df["latitude"], bins=lat_bins, labels=False, include_lowest=True)
    df["grid_cell"] = df["lon_bin"].astype(str) + "_" + df["lat_bin"].astype(str)

    sampled_indices = []
    for cell in df["grid_cell"].unique():
        cell_data = df[df["grid_cell"] == cell]
        if balance_classes:
            for cls in cell_data["LC"].unique():
                cls_data = cell_data[cell_data["LC"] == cls]
                n = min(samples_per_cell, len(cls_data))
                if n > 0:
                    sampled_indices.extend(cls_data.sample(n=n, random_state=42).index)
        else:
            n = min(samples_per_cell * 2, len(cell_data))
            sampled_indices.extend(cell_data.sample(n=n, random_state=42).index)

    return df.loc[sampled_indices].drop(["lon_bin", "lat_bin", "grid_cell"], axis=1)


def kmeans_spatial_sampling(df: pd.DataFrame, n_clusters: int = 50,
                            samples_per_cluster: int = 5):
    """
    Cluster the point cloud with K-Means and draw spatially balanced samples
    from each cluster.

    Returns
    -------
    sampled_df  : Sampled DataFrame
    kmeans_model: Fitted KMeans object
    """
    coords = df[["longitude", "latitude"]].values
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    df["cluster"] = kmeans.fit_predict(coords)

    sampled_indices = []
    for cluster_id in range(n_clusters):
        cluster_data = df[df["cluster"] == cluster_id]
        for cls in [0, 1]:
            cls_data = cluster_data[cluster_data["LC"] == cls]
            if len(cls_data) > 0:
                n = min(samples_per_cluster, len(cls_data))
                sampled_indices.extend(cls_data.sample(n=n, random_state=42).index)

    return df.loc[sampled_indices].drop(["cluster"], axis=1), kmeans


def min_distance_sampling(df: pd.DataFrame, min_distance: float = 0.005,
                          seed: int = 42) -> pd.DataFrame:
    """
    Remove samples that are closer than `min_distance` degrees to any already
    selected sample.  Processes each class independently to preserve balance.

    Parameters
    ----------
    min_distance : Minimum separation in degrees (~555 m/° at the equator)
    """
    np.random.seed(seed)
    sampled_dfs = []
    for cls in df["LC"].unique():
        cls_df = df[df["LC"] == cls].copy()
        coords = cls_df[["longitude", "latitude"]].values
        indices = np.random.permutation(len(cls_df))
        selected_indices, selected_coords = [], []
        for idx in indices:
            if not selected_coords:
                selected_indices.append(cls_df.index[idx])
                selected_coords.append(coords[idx])
            else:
                dists = cdist([coords[idx]], selected_coords, metric="euclidean")
                if np.min(dists) >= min_distance:
                    selected_indices.append(cls_df.index[idx])
                    selected_coords.append(coords[idx])
        sampled_dfs.append(df.loc[selected_indices])
    return pd.concat(sampled_dfs, ignore_index=True)


def calculate_spatial_coverage(df: pd.DataFrame, n_bins: int = 10):
    """Return the fraction of grid cells that contain at least one sample."""
    lon_bins = pd.cut(df["longitude"], bins=n_bins)
    lat_bins = pd.cut(df["latitude"], bins=n_bins)
    occupied_cells = df.groupby([lon_bins, lat_bins]).size().reset_index()
    total_cells = n_bins * n_bins
    occupied = len(occupied_cells)
    return (occupied / total_cells) * 100, occupied, total_cells


# Apply all three methods to compare spatial coverage
df_clean_rf = df_clean[feature_cols_corrected + ["LC", "ID"]]
if "longitude" not in df_clean_rf.columns:
    df_clean_rf = df_clean_rf.merge(df_coordinates_Medellin, on="ID", how="left")

df_grid    = grid_based_sampling(df_clean_rf, grid_size=15, samples_per_cell=2)
df_kmeans, kmeans_model = kmeans_spatial_sampling(df_clean_rf, n_clusters=40, samples_per_cluster=3)
df_mindist = min_distance_sampling(df_clean_rf, min_distance=0.004)   # ≈ 400 m

datasets = [
    (df_clean_rf, "Original"),
    (df_grid,     "Grid-based"),
    (df_kmeans,   "K-Means"),
    (df_mindist,  "Min-Distance"),
]

# Spatial coverage comparison
print(f"\n{'Method':<20s} | Coverage")
print("-" * 40)
for data, name in datasets:
    cov, occ, tot = calculate_spatial_coverage(data, n_bins=10)
    print(f"{name:<20s} | {occ}/{tot} cells ({cov:.1f}%)")

# =============================================================================
# 5. RANDOM FOREST – SEQUENTIAL FEATURE SELECTION + HYPERPARAMETER TUNING
# =============================================================================

X = df_clean_rf[feature_cols_corrected]
y = df_clean_rf["LC"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

rf_model = RandomForestClassifier(n_estimators=100, random_state=42)

# --- Forward Selection ---
sfs_rf_fwd = SFS(rf_model, k_features="best", forward=True, floating=True,
                 scoring="accuracy", n_jobs=-1, cv=4)
sfs_rf_fwd.fit(X_train, y_train)
results_fwd = sfs_rf_fwd.get_metric_dict()
best_idx_fwd = max(results_fwd, key=lambda k: results_fwd[k]["avg_score"])
best_features_fwd = list(results_fwd[best_idx_fwd]["feature_names"])
best_score_fwd    = results_fwd[best_idx_fwd]["avg_score"]

# --- Backward Elimination ---
sfs_rf_bwd = SFS(rf_model, k_features=1, forward=False, floating=True,
                 scoring="accuracy", n_jobs=-1, cv=4)
sfs_rf_bwd.fit(X_train, y_train)
results_bwd = sfs_rf_bwd.get_metric_dict()
best_idx_bwd = max(results_bwd, key=lambda k: results_bwd[k]["avg_score"])
best_features_bwd = list(results_bwd[best_idx_bwd]["feature_names"])
best_score_bwd    = results_bwd[best_idx_bwd]["avg_score"]

# Select the better subset
if best_score_bwd > best_score_fwd:
    best_features_overall = best_features_bwd
    print(f"RF best features (Backward Elimination): {best_features_overall}")
else:
    best_features_overall = best_features_fwd
    print(f"RF best features (Forward Selection): {best_features_overall}")

# Spatial sampling with the best RF features
X_rf = df_mindist[best_features_overall].values
y_rf = df_mindist["LC"].values
X_train_rf, X_test_rf, y_train_rf, y_test_rf = train_test_split(
    X_rf, y_rf, test_size=0.3, random_state=42, stratify=y_rf
)

# Hyperparameter grid search
rf_base = RandomForestClassifier(random_state=42)
param_grid_rf = {
    "n_estimators"    : [100, 200, 300],
    "max_depth"       : [None, 10, 20],
    "min_samples_split": [2, 5],
    "min_samples_leaf" : [1, 2],
    "max_features"    : ["sqrt", "log2", None],
}
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
grid_rf = GridSearchCV(rf_base, param_grid_rf, cv=skf, scoring="accuracy",
                       n_jobs=-1, return_train_score=True)
grid_rf.fit(X_train_rf, y_train_rf)
best_rf = grid_rf.best_estimator_
print(f"\nRF best params: {grid_rf.best_params_}")

# Cross-validated evaluation
y_pred_cv_rf   = cross_val_predict(best_rf, X_rf, y_rf, cv=skf)
y_proba_cv_rf  = cross_val_predict(best_rf, X_rf, y_rf, cv=skf, method="predict_proba")[:, 1]
print("\nRandom Forest – Cross-Validated Report:")
print(classification_report(y_rf, y_pred_cv_rf, digits=3))

# =============================================================================
# 6. SUPPORT VECTOR MACHINE – SEQUENTIAL FEATURE SELECTION + TUNING
# =============================================================================

df_clean_svm = df_clean[feature_cols_corrected + ["LC", "ID"]]
X_svm = df_clean_svm[feature_cols_corrected]
y_svm = df_clean_svm["LC"]
X_train_svm, X_test_svm, y_train_svm, y_test_svm = train_test_split(
    X_svm, y_svm, test_size=0.3, random_state=42
)

svm_model = SVC(random_state=42)

# --- SVM Forward Selection ---
sfs_svm_fwd = SFS(svm_model, k_features="best", forward=True, floating=True,
                  scoring="accuracy", n_jobs=-1, cv=4)
sfs_svm_fwd.fit(X_train_svm, y_train_svm)
results_svm_fwd = sfs_svm_fwd.get_metric_dict()
best_idx_svm_fwd = max(results_svm_fwd, key=lambda k: results_svm_fwd[k]["avg_score"])
best_features_svm_fwd = list(results_svm_fwd[best_idx_svm_fwd]["feature_names"])
best_score_svm_fwd    = results_svm_fwd[best_idx_svm_fwd]["avg_score"]

# --- SVM Backward Elimination ---
sfs_svm_bwd = SFS(svm_model, k_features=1, forward=False, floating=True,
                  scoring="accuracy", n_jobs=-1, cv=4)
sfs_svm_bwd.fit(X_train_svm, y_train_svm)
results_svm_bwd = sfs_svm_bwd.get_metric_dict()
best_idx_svm_bwd = max(results_svm_bwd, key=lambda k: results_svm_bwd[k]["avg_score"])
best_features_svm_bwd = list(results_svm_bwd[best_idx_svm_bwd]["feature_names"])
best_score_svm_bwd    = results_svm_bwd[best_idx_svm_bwd]["avg_score"]

if best_score_svm_bwd > best_score_svm_fwd:
    best_features_overall_svm = best_features_svm_bwd
    print(f"\nSVM best features (Backward Elimination): {best_features_overall_svm}")
else:
    best_features_overall_svm = best_features_svm_fwd
    print(f"\nSVM best features (Forward Selection): {best_features_overall_svm}")

# Retain only the min-distance spatial subset for SVM training
df_mindist_svm = df_clean_svm[df_clean_svm["ID"].isin(df_mindist["ID"])]
X_svm_md = df_mindist_svm[best_features_overall_svm].values
y_svm_md = df_mindist_svm["LC"].values
X_train_sm, X_test_sm, y_train_sm, y_test_sm = train_test_split(
    X_svm_md, y_svm_md, test_size=0.3, random_state=42, stratify=y_svm_md
)

# Normalisation: RobustScaler is preferred for SVM (resistant to outliers)
scaler_standard = StandardScaler()
scaler_robust   = RobustScaler()
X_train_scaled  = scaler_standard.fit_transform(X_train_sm)
X_test_scaled   = scaler_standard.transform(X_test_sm)
X_train_robust  = scaler_robust.fit_transform(X_train_sm)
X_test_robust   = scaler_robust.transform(X_test_sm)

# Hyperparameter grid search for SVM
svm_base = SVC(random_state=42, probability=True)
param_grid_svm = {
    "C"     : [0.1, 1, 10],
    "kernel": ["linear", "rbf", "poly"],
    "gamma" : ["scale", "auto"],
}
grid_svm = GridSearchCV(svm_base, param_grid_svm, cv=skf, scoring="accuracy",
                        n_jobs=-1, return_train_score=True)
grid_svm.fit(X_train_robust, y_train_sm)
best_svm = grid_svm.best_estimator_
print(f"\nSVM best params: {grid_svm.best_params_}")

# Cross-validated evaluation
y_pred_cv_svm  = cross_val_predict(best_svm, X_svm_md, y_svm_md, cv=skf)
y_proba_cv_svm = cross_val_predict(best_svm, X_svm_md, y_svm_md, cv=skf,
                                   method="predict_proba")[:, 1]
print("\nSVM – Cross-Validated Report:")
print(classification_report(y_svm_md, y_pred_cv_svm, digits=3))

# =============================================================================
# 7. GENERALISATION TEST ON BOGOTÁ (independent city, different geography)
# =============================================================================

df_bogota = pd.read_csv("Bogota_Test_Optimal.csv")
df_bogota["ID"] = df_bogota.index + 1

outliers_bogota = detect_outliers_zscore(df_bogota, feature_cols, threshold=4)
df_clean_bogota = df_bogota[~outliers_bogota][feature_cols_corrected + ["LC", "ID"]]

df_grid_bogota  = grid_based_sampling(df_clean_bogota, grid_size=15, samples_per_cell=2)
X_bogota        = df_grid_bogota[best_features_overall_svm].values
y_bogota        = df_grid_bogota["LC"].values
X_bogota_scaled = scaler_robust.transform(X_bogota)

y_pred_bogota  = best_svm.predict(X_bogota_scaled)
y_proba_bogota = best_svm.predict_proba(X_bogota_scaled)[:, 1]

print("\nSVM – Bogotá Generalisation Test:")
print(classification_report(y_bogota, y_pred_bogota, digits=3))

# =============================================================================
# 8. FULL-IMAGE CLASSIFICATION (Medellín – before / 2020 / after)
# =============================================================================

def classify_raster(input_tif: str, output_tif: str, selected_features: list,
                    feature_cols_all: list, model, scaler,
                    nodata_value: float = -9999, batch_size: int = 10_000):
    """
    Classify a multi-band GeoTIFF pixel-by-pixel using a pre-trained sklearn model.

    Parameters
    ----------
    input_tif        : Path to the input multi-band GeoTIFF
    output_tif       : Path for the classified single-band output GeoTIFF
    selected_features: List of feature names chosen during SFS
    feature_cols_all : Ordered list of all features (defines band order in TIF)
    model            : Fitted sklearn classifier
    scaler           : Fitted sklearn scaler (must match training scaler)
    nodata_value     : Value used to flag missing pixels
    batch_size       : Number of pixels per classification batch (memory control)

    Returns
    -------
    dict with keys 'n_nonveg' and 'n_veg' (pixel counts per class)
    """
    band_indices = [feature_cols_all.index(f) for f in selected_features]

    with rasterio.open(input_tif) as src:
        # Read only the required bands
        selected_bands = [src.read(idx + 1) for idx in band_indices]
        selected_stack = np.stack(selected_bands, axis=0)
        profile = src.profile.copy()
        n_bands, height, width = selected_stack.shape

    n_pixels = height * width
    img_flat = selected_stack.reshape(n_bands, -1).T   # (n_pixels, n_bands)

    # Valid-pixel mask: exclude NaN, Inf, and NoData
    valid_mask = ~np.any(
        np.isnan(img_flat) | np.isinf(img_flat) |
        (img_flat == nodata_value) | (img_flat == 0),
        axis=1
    )
    img_valid = img_flat[valid_mask]
    img_scaled = scaler.transform(img_valid)

    # Batch classification (prevents memory overflow on large images)
    predictions = np.zeros(len(img_scaled), dtype=np.uint8)
    for i in tqdm(range(0, len(img_scaled), batch_size), desc=f"Classifying {input_tif}"):
        batch = img_scaled[i:i + batch_size]
        predictions[i:i + batch_size] = model.predict(batch)

    # Reconstruct 2D classified image
    classified_flat = np.full(n_pixels, 255, dtype=np.uint8)   # 255 = NoData
    classified_flat[valid_mask] = predictions
    classified_img = classified_flat.reshape(height, width)

    # Save output GeoTIFF
    out_profile = profile.copy()
    out_profile.update(dtype=rasterio.uint8, count=1, nodata=255, compress="lzw")
    with rasterio.open(output_tif, "w", **out_profile) as dst:
        dst.write(classified_img, 1)

    n_nonveg = (predictions == 0).sum()
    n_veg    = (predictions == 1).sum()
    print(f"  Non-Vegetation : {n_nonveg:,} px ({n_nonveg / len(predictions) * 100:.1f}%)")
    print(f"  Vegetation     : {n_veg:,} px ({n_veg    / len(predictions) * 100:.1f}%)")
    return {"n_nonveg": n_nonveg, "n_veg": n_veg}


def reproject_raster(src_path: str, dst_path: str,
                     src_crs: str = "EPSG:4326",
                     dst_crs: str = "EPSG:3116"):
    """
    Reproject a GeoTIFF from WGS-84 to MAGNA-SIRGAS / Colombia Bogotá zone
    (EPSG:3116), which uses metres as the linear unit.

    EPSG:3116 is the official projected CRS for central Colombia and is
    required for accurate area calculations in km².
    """
    # Workaround for PROJ database conflicts with PostgreSQL on Windows
    _fix_proj_path()

    with rasterio.open(src_path) as src:
        transform, width, height = calculate_default_transform(
            src_crs, dst_crs, src.width, src.height, *src.bounds
        )
        kwargs = src.meta.copy()
        kwargs.update(crs=dst_crs, transform=transform, width=width, height=height)
        with rasterio.open(dst_path, "w", **kwargs) as dst:
            for i in range(1, src.count + 1):
                reproject(
                    source=rasterio.band(src, i),
                    destination=rasterio.band(dst, i),
                    src_transform=src.transform, src_crs=src_crs,
                    dst_transform=transform, dst_crs=dst_crs,
                    resampling=Resampling.nearest
                )
    print(f"✓ Reprojected → {dst_path}")


def _fix_proj_path():
    """
    Remove PostgreSQL/PostGIS paths from the environment to prevent PROJ
    database conflicts on Windows machines that have both PostgreSQL and
    Python/GDAL installed.
    """
    original_path = os.environ.get("PATH", "")
    filtered = [p for p in original_path.split(os.pathsep)
                if "PostgreSQL" not in p and "postgis" not in p.lower()]
    os.environ["PATH"] = os.pathsep.join(filtered)
    for var in ("PROJ_LIB", "PROJ_DATA"):
        if var in os.environ and "PostgreSQL" in os.environ[var]:
            del os.environ[var]


def calc_class_areas(raster_path: str, assume_nodata=None) -> pd.DataFrame:
    """
    Compute per-class pixel counts and areas (m², km², %) for a classified
    GeoTIFF.  Assumes the raster is already in a metric CRS (e.g. EPSG:3116).

    Parameters
    ----------
    raster_path  : Path to the classified GeoTIFF
    assume_nodata: Override the raster's internal NoData value if needed
    """
    with rasterio.open(raster_path) as src:
        arr = src.read(1, masked=True)
        if assume_nodata is not None:
            arr.mask |= (arr.data == assume_nodata)
        transform = src.transform
        px_area = abs(transform.a * transform.e)   # pixel area in m²

    data = arr.compressed()
    classes, counts = np.unique(data, return_counts=True)
    df_out = pd.DataFrame({
        "class"     : classes,
        "pixel_count": counts,
        "area_m2"   : counts * px_area,
        "area_km2"  : counts * px_area / 1e6,
    })
    df_out.attrs["pixel_area_m2"] = px_area
    return df_out.sort_values("class").reset_index(drop=True)


# -- Classify all three epochs ---
print("\nClassifying Medellín images...")
classify_raster("S2_Medellin_Texture_before.tif", "Classified_SVM_before.tif",
                best_features_overall_svm, feature_cols, best_svm, scaler_robust)
classify_raster("S2_Medellin_Texture_20.tif",     "Classified_SVM_20.tif",
                best_features_overall_svm, feature_cols, best_svm, scaler_robust)
classify_raster("S2_Medellin_Texture_after.tif",  "Classified_SVM_after.tif",
                best_features_overall_svm, feature_cols, best_svm, scaler_robust)

# Reproject to EPSG:3116 for metric area calculations
reproject_raster("Classified_SVM_before.tif", "landcover_reprojected_before.tif")
reproject_raster("Classified_SVM_after.tif",  "landcover_riproiettata.tif")

results_before = calc_class_areas("landcover_reprojected_before.tif")
results_after  = calc_class_areas("landcover_riproiettata.tif")

df_change = results_before.merge(results_after, on="class", suffixes=("_before", "_after"))
df_change["diff_km2"] = (df_change["area_km2_after"] - df_change["area_km2_before"])
df_change["pct_change"] = (
    (df_change["area_km2_after"] - df_change["area_km2_before"])
    / df_change["area_km2_before"] * 100
)
print("\nLand Cover Change (before → after):")
print(df_change.to_string(index=False))

# =============================================================================
# 9. CHANGE DETECTION INSIDE GREEN CORRIDORS
# =============================================================================

# Load the corridor polygons (clipped to the city AOI)
corridors_shp = gpd.read_file("corridors_clippedAOI.gpkg")

# Align CRS of the shapefile to the raster
with rasterio.open("landcover_riproiettata.tif") as src:
    raster_crs = src.crs
corridors_proj = corridors_shp.to_crs(raster_crs)

geoms = [g.__geo_interface__ for g in corridors_proj.geometry]

# Clip classified rasters to corridor extent
for in_tif, out_tif in [
    ("landcover_riproiettata.tif",      "clipped_corr_after.tif"),
    ("landcover_reprojected_before.tif", "clipped_corr_before.tif"),
]:
    with rasterio.open(in_tif) as src:
        out_image, out_transform = rasterio.mask.mask(src, geoms, crop=True, nodata=255)
        out_meta = src.meta.copy()
        out_meta.update(driver="GTiff", height=out_image.shape[1],
                        width=out_image.shape[2], transform=out_transform, nodata=255)
    with rasterio.open(out_tif, "w", **out_meta) as dst:
        dst.write(out_image)
    print(f"✓ Clipped corridors → {out_tif}")

areas_before_corr = calc_class_areas("clipped_corr_before.tif")
areas_after_corr  = calc_class_areas("clipped_corr_after.tif")
df_corr_change    = areas_before_corr.merge(areas_after_corr, on="class",
                                            suffixes=("_before", "_after"))
df_corr_change["diff_km2"] = (
    df_corr_change["area_km2_after"] - df_corr_change["area_km2_before"]
)
print("\nVegetation change INSIDE corridors:")
print(df_corr_change.to_string(index=False))

# =============================================================================
# 10. THERMAL (LST) CHANGE ANALYSIS – Landsat-8 Band 10
# =============================================================================

def landsat_b10_to_celsius(band_path: str, ML: float, AL: float,
                           min_temp: float = -50, max_temp: float = 60):
    """
    Convert a Landsat-8 Collection-2 ST_B10 raster (DN uint16) to Land
    Surface Temperature in degrees Celsius.

    Conversion formula:
        T_K = ML × DN + AL      (radiance scaling)
        T_C = T_K – 273.15      (Kelvin → Celsius)

    Parameters
    ----------
    band_path : Path to the single-band GeoTIFF
    ML        : Multiplicative rescaling factor (from MTL metadata, e.g. 0.00341802)
    AL        : Additive rescaling factor (from MTL metadata, e.g. 149.0)
    min_temp  : Lower bound for valid land temperatures (°C)
    max_temp  : Upper bound for valid land temperatures (°C)
    """
    with rasterio.open(band_path) as src:
        band    = src.read(1).astype("float32")
        profile = src.profile
        nodata  = src.nodata

    T_K   = ML * band + AL
    T_C   = T_K - 273.15
    mask  = (band == nodata) if nodata is not None else np.isnan(band)
    mask |= (T_C < min_temp) | (T_C > max_temp) | np.isnan(T_C)

    return np.ma.masked_where(mask, T_C), profile


def reproject_to_match(src_path: str, dst_path: str, reference_path: str,
                       resampling=Resampling.bilinear):
    """
    Reproject and resample `src_path` to exactly match the grid (CRS, transform,
    width, height) of `reference_path`.  Used to align Landsat thermal imagery
    with the Sentinel-2 / DEM reference grid.
    """
    with rasterio.open(reference_path) as ref:
        dst_crs = ref.crs
        dst_transform, dst_width, dst_height = ref.transform, ref.width, ref.height
        dst_profile = ref.profile.copy()
        dst_profile.update(dtype=rasterio.float32, count=1, compress="lzw")

    with rasterio.open(src_path) as src:
        dst_profile.update(height=dst_height, width=dst_width,
                           transform=dst_transform, crs=dst_crs)
        with rasterio.open(dst_path, "w", **dst_profile) as dst:
            reproject(
                source=rasterio.band(src, 1),
                destination=rasterio.band(dst, 1),
                src_transform=src.transform, src_crs=src.crs,
                dst_transform=dst_transform, dst_crs=dst_crs,
                resampling=resampling
            )
    print(f"✓ Aligned to reference grid → {dst_path}")


# Landsat-8 Collection-2 ST_B10 scaling coefficients (from MTL metadata)
ML, AL = 0.00341802, 149.0

# Reproject DEM and align thermal images to DEM grid
reproject_raster("dem_medellin.tif", "dem_medellin_meters.tif")
reproject_to_match("thermal_Before.tif", "thermal_Before_on_dem.tif", "dem_medellin_meters.tif")
reproject_to_match("thermal_After.tif",  "thermal_After_on_dem.tif",  "dem_medellin_meters.tif")

T1, _ = landsat_b10_to_celsius("thermal_Before_on_dem.tif", ML, AL)
T2, _ = landsat_b10_to_celsius("thermal_After_on_dem.tif",  ML, AL)

# Mask analysis to the city AOI
aoi_gdf = gpd.read_file("aoi.shp")
with rasterio.open("dem_medellin_meters.tif") as src:
    dem    = src.read(1)
    t_dem  = src.transform
    crs    = src.crs
if aoi_gdf.crs != crs:
    aoi_gdf = aoi_gdf.to_crs(crs)

aoi_mask = rasterize(
    [(geom, 1) for geom in aoi_gdf.geometry],
    out_shape=dem.shape, transform=t_dem, fill=0, dtype="uint8"
)
aoi_mask = (aoi_mask == 0)   # True = outside AOI

T1   = np.ma.masked_where(aoi_mask, T1)
T2   = np.ma.masked_where(aoi_mask, T2)
diff = np.ma.masked_where(aoi_mask, T2 - T1)

print(f"\nMean LST Before : {np.ma.mean(T1):.2f} °C")
print(f"Mean LST After  : {np.ma.mean(T2):.2f} °C")
print(f"Mean LST Change : {np.ma.mean(diff):.2f} °C")

# Save thermal difference raster
with rasterio.open("dem_medellin_meters.tif") as src:
    out_profile = src.profile.copy()
out_profile.update(dtype=rasterio.float32, nodata=-9999, count=1)
with rasterio.open("thermal_diff_on_dem.tif", "w", **out_profile) as dst:
    dst.write(np.ma.filled(diff.astype(np.float32), -9999), 1)
print("✓ Saved: thermal_diff_on_dem.tif")
