from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np

from .signals import confidence_score_from_return


MODEL_VERSION = 1
_FEATURE_NAMES = [
    'predicted_return',
    'baseline_return',
    'realized_volatility',
    'short_trend',
    'medium_trend',
    'days_to_earnings',
    'news_score',
    'community_score',
    'event_risk_score',
    'direction_score',
    'news_count',
    'community_count',
]
_EVENT_RISK_TO_INDEX = {'low': 0, 'moderate': 1, 'high': 2}
_INDEX_TO_EVENT_RISK = ['low', 'moderate', 'high']


def _to_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_finite_float(value: Any) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if not np.isfinite(parsed):
        return None
    return parsed


def _get_feature_value(row: dict[str, Any], feature: str) -> float:
    if feature in row:
        return _to_float(row.get(feature))
    nested = row.get('calibration_features')
    if isinstance(nested, dict):
        return _to_float(nested.get(feature))
    return 0.0


def _delta_return_target(row: dict[str, Any]) -> float | None:
    explicit_target = row.get('delta_return_target')
    if explicit_target is not None:
        return _to_finite_float(explicit_target)

    realized = row.get('actual_return_1d')
    if realized is None:
        return None

    base_prediction = row.get('base_predicted_return')
    if base_prediction is None:
        base_prediction = row.get('predicted_return')
    if base_prediction is None:
        return None

    realized_value = _to_finite_float(realized)
    base_prediction_value = _to_finite_float(base_prediction)
    if realized_value is None or base_prediction_value is None:
        return None

    delta_target = realized_value - base_prediction_value
    if not np.isfinite(delta_target):
        return None
    return delta_target


def _is_labeled_event_risk(value: Any) -> bool:
    return isinstance(value, str) and value.lower() in _EVENT_RISK_TO_INDEX


def _confidence_target(hit_label: Any) -> float | None:
    try:
        return 1.0 if int(hit_label) > 0 else -1.0
    except (TypeError, ValueError):
        return None


def _iter_training_targets(rows: list[dict[str, Any]]):
    for row in rows:
        delta_target = _delta_return_target(row)
        confidence_target = _confidence_target(row.get('hit_label'))
        event_risk_label = row.get('event_risk_target')

        if delta_target is None or confidence_target is None or not _is_labeled_event_risk(event_risk_label):
            continue

        feature_values = [_get_feature_value(row, feature_name) for feature_name in _FEATURE_NAMES]
        if any(not np.isfinite(value) for value in feature_values):
            continue

        yield feature_values, float(delta_target), confidence_target, _EVENT_RISK_TO_INDEX[str(event_risk_label).lower()]


def count_trainable_rows(rows: list[dict[str, Any]]) -> int:
    return sum(1 for _ in _iter_training_targets(rows))


def _extract_training_arrays(rows: list[dict[str, Any]]) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    feature_rows: list[list[float]] = []
    delta_return_targets: list[float] = []
    confidence_targets: list[float] = []
    risk_targets: list[int] = []

    for feature_values, delta_target, confidence_target, risk_target in _iter_training_targets(rows):
        feature_rows.append(feature_values)
        delta_return_targets.append(delta_target)
        confidence_targets.append(confidence_target)
        risk_targets.append(risk_target)

    if not feature_rows:
        raise ValueError('No labeled calibration rows available for model training')

    return (
        np.asarray(feature_rows, dtype=float),
        np.asarray(delta_return_targets, dtype=float),
        np.asarray(confidence_targets, dtype=float),
        np.asarray(risk_targets, dtype=int),
    )


def _fit_ridge(features: np.ndarray, target: np.ndarray, alpha: float) -> np.ndarray:
    design = np.column_stack([np.ones((features.shape[0], 1), dtype=float), features])
    regularizer = np.eye(design.shape[1], dtype=float)
    regularizer[0, 0] = 0.0
    return np.linalg.pinv(design.T @ design + alpha * regularizer) @ (design.T @ target)


def _predict_linear(features: np.ndarray, coefficients: np.ndarray) -> np.ndarray:
    return np.column_stack([np.ones((features.shape[0], 1), dtype=float), features]) @ coefficients


def _event_risk_score(features: np.ndarray) -> np.ndarray:
    predicted_return = np.abs(features[:, _FEATURE_NAMES.index('predicted_return')])
    realized_volatility = np.abs(features[:, _FEATURE_NAMES.index('realized_volatility')])
    short_trend = features[:, _FEATURE_NAMES.index('short_trend')]
    medium_trend = features[:, _FEATURE_NAMES.index('medium_trend')]
    trend_gap = np.abs(short_trend - medium_trend)
    return predicted_return + realized_volatility + 0.25 * trend_gap


def _derive_risk_thresholds(scores: np.ndarray, classes: np.ndarray) -> tuple[float, float]:
    low_scores = scores[classes == 0]
    moderate_scores = scores[classes == 1]
    high_scores = scores[classes == 2]

    if low_scores.size and moderate_scores.size:
        moderate_threshold = float((np.median(low_scores) + np.median(moderate_scores)) / 2)
    else:
        moderate_threshold = float(np.quantile(scores, 0.45))

    if moderate_scores.size and high_scores.size:
        high_threshold = float((np.median(moderate_scores) + np.median(high_scores)) / 2)
    else:
        high_threshold = float(np.quantile(scores, 0.8))

    if high_threshold <= moderate_threshold:
        high_threshold = moderate_threshold + 1e-6

    return moderate_threshold, high_threshold


def _classify_event_risk(scores: np.ndarray, moderate_threshold: float, high_threshold: float) -> np.ndarray:
    classes = np.zeros(scores.shape[0], dtype=int)
    classes[scores >= moderate_threshold] = 1
    classes[scores >= high_threshold] = 2
    return classes


def _weights_payload(coefficients: np.ndarray) -> dict[str, float]:
    return {feature_name: float(coefficients[idx + 1]) for idx, feature_name in enumerate(_FEATURE_NAMES)}


def train_overlay_model(rows: list[dict[str, Any]], output_path: Path) -> dict[str, Any]:
    features, return_target, confidence_target, risk_target = _extract_training_arrays(rows)

    return_coefficients = _fit_ridge(features, return_target, alpha=1.0)
    return_predictions = _predict_linear(features, return_coefficients)

    confidence_coefficients = _fit_ridge(features, confidence_target, alpha=2.0)
    confidence_raw = _predict_linear(features, confidence_coefficients)
    confidence_bound = max(0.05, min(0.35, float(np.quantile(np.abs(confidence_raw), 0.9))))
    confidence_predictions = np.clip(confidence_raw, -confidence_bound, confidence_bound)

    risk_scores = _event_risk_score(features)
    moderate_threshold, high_threshold = _derive_risk_thresholds(risk_scores, risk_target)
    risk_predictions = _classify_event_risk(risk_scores, moderate_threshold, high_threshold)

    artifact = {
        'version': MODEL_VERSION,
        'trained_at': datetime.now(UTC).isoformat(),
        'row_count': int(features.shape[0]),
        'feature_names': list(_FEATURE_NAMES),
        'coefficients': {
            'delta_return': {
                'alpha': 1.0,
                'intercept': float(return_coefficients[0]),
                'weights': _weights_payload(return_coefficients),
            },
            'delta_confidence': {
                'alpha': 2.0,
                'intercept': float(confidence_coefficients[0]),
                'weights': _weights_payload(confidence_coefficients),
                'max_abs_adjustment': float(confidence_bound),
            },
            'event_risk_score': {
                'predicted_return_abs': 1.0,
                'realized_volatility_abs': 1.0,
                'trend_gap_abs': 0.25,
            },
        },
        'metrics': {
            'delta_return_mae': float(np.mean(np.abs(return_target - return_predictions))),
            'delta_return_rmse': float(np.sqrt(np.mean(np.square(return_target - return_predictions)))),
            'delta_confidence_mae': float(np.mean(np.abs(confidence_target - confidence_predictions))),
            'event_risk_accuracy': float(np.mean((risk_predictions == risk_target).astype(float))),
        },
        'thresholds': {
            'confidence_delta': {'min': float(-confidence_bound), 'max': float(confidence_bound)},
            'event_risk': {'moderate': float(moderate_threshold), 'high': float(high_threshold)},
            'event_risk_labels': list(_INDEX_TO_EVENT_RISK),
        },
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(artifact, indent=2), encoding='utf-8')
    return artifact


def _validate_linear_block(block: Any, feature_names: list[str]) -> bool:
    if not isinstance(block, dict):
        return False
    if _to_finite_float(block.get('intercept')) is None:
        return False
    weights = block.get('weights')
    if not isinstance(weights, dict):
        return False
    return set(weights) == set(feature_names) and all(_to_finite_float(weights.get(name)) is not None for name in feature_names)


def _validate_overlay_model(payload: dict[str, Any]) -> bool:
    feature_names = payload.get('feature_names')
    coefficients = payload.get('coefficients')
    metrics = payload.get('metrics')
    thresholds = payload.get('thresholds')

    if payload.get('version') != MODEL_VERSION:
        return False
    if not isinstance(feature_names, list) or feature_names != list(_FEATURE_NAMES):
        return False
    if _to_finite_float(payload.get('row_count')) is None:
        return False
    if not isinstance(coefficients, dict) or not isinstance(metrics, dict) or not isinstance(thresholds, dict):
        return False
    if not _validate_linear_block(coefficients.get('delta_return'), feature_names):
        return False
    if not _validate_linear_block(coefficients.get('delta_confidence'), feature_names):
        return False

    confidence_thresholds = thresholds.get('confidence_delta')
    event_risk_thresholds = thresholds.get('event_risk')
    event_risk_labels = thresholds.get('event_risk_labels')
    if not isinstance(confidence_thresholds, dict) or not isinstance(event_risk_thresholds, dict):
        return False
    if _to_finite_float(confidence_thresholds.get('min')) is None or _to_finite_float(confidence_thresholds.get('max')) is None:
        return False
    if _to_finite_float(event_risk_thresholds.get('moderate')) is None or _to_finite_float(event_risk_thresholds.get('high')) is None:
        return False
    if list(event_risk_labels or []) != _INDEX_TO_EVENT_RISK:
        return False
    return True


def load_overlay_model(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None

    try:
        payload = json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return None

    if not isinstance(payload, dict):
        return None
    if not _validate_overlay_model(payload):
        return None
    return payload


def _build_feature_vector(feature_snapshot: dict[str, Any], feature_names: list[str]) -> np.ndarray:
    return np.asarray([_get_feature_value(feature_snapshot, feature_name) for feature_name in feature_names], dtype=float)


def _predict_from_artifact_block(block: dict[str, Any], feature_names: list[str], feature_vector: np.ndarray) -> float:
    intercept = float(block['intercept'])
    weights = np.asarray([float(block['weights'][feature_name]) for feature_name in feature_names], dtype=float)
    return float(intercept + np.dot(weights, feature_vector))


def _clip(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _top_reason_codes(
    feature_vector: np.ndarray,
    feature_names: list[str],
    return_weights: dict[str, float],
    confidence_weights: dict[str, float],
    limit: int = 3,
) -> list[str]:
    contributions: list[tuple[float, str]] = []
    for index, feature_name in enumerate(feature_names):
        feature_value = float(feature_vector[index])
        contribution = abs(float(return_weights[feature_name]) * feature_value) + abs(float(confidence_weights[feature_name]) * feature_value)
        if contribution > 0:
            contributions.append((contribution, feature_name))

    if not contributions:
        return ['predicted_return']

    ordered = sorted(contributions, key=lambda item: (-item[0], item[1]))
    return [feature_name for _, feature_name in ordered[:limit]]


def apply_overlay_model(
    model_artifact: dict[str, Any],
    feature_snapshot: dict[str, Any],
    *,
    base_predicted_return: float,
) -> dict[str, Any]:
    if not _validate_overlay_model(model_artifact):
        raise ValueError('Invalid calibration model artifact')

    feature_names = list(model_artifact['feature_names'])
    feature_vector = _build_feature_vector(feature_snapshot, feature_names)
    if feature_vector.shape[0] != len(feature_names) or not np.all(np.isfinite(feature_vector)):
        raise ValueError('Invalid calibration feature snapshot')

    coefficients = model_artifact['coefficients']
    thresholds = model_artifact['thresholds']
    delta_return = _predict_from_artifact_block(coefficients['delta_return'], feature_names, feature_vector)
    confidence_delta = _predict_from_artifact_block(coefficients['delta_confidence'], feature_names, feature_vector)

    confidence_bounds = thresholds['confidence_delta']
    bounded_confidence_delta = _clip(
        confidence_delta,
        float(confidence_bounds['min']),
        float(confidence_bounds['max']),
    )
    base_confidence = confidence_score_from_return(base_predicted_return)
    adjusted_predicted_return = float(base_predicted_return + delta_return)
    adjusted_confidence_score = _clip(base_confidence + bounded_confidence_delta, 0.0, 1.0)

    risk_thresholds = thresholds['event_risk']
    risk_score = float(_event_risk_score(feature_vector.reshape(1, -1))[0])
    if risk_score >= float(risk_thresholds['high']):
        event_risk = 'high'
    elif risk_score >= float(risk_thresholds['moderate']):
        event_risk = 'moderate'
    else:
        event_risk = 'low'

    return {
        'adjusted_predicted_return': adjusted_predicted_return,
        'adjusted_confidence_score': adjusted_confidence_score,
        'event_risk': event_risk,
        'calibration_reason_codes': _top_reason_codes(
            feature_vector,
            feature_names,
            coefficients['delta_return']['weights'],
            coefficients['delta_confidence']['weights'],
        ),
    }
