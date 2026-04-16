import json
from pathlib import Path

import numpy as np

from stokz_forecast import cli
from stokz_forecast.calibration_features import build_feature_snapshot
from stokz_forecast.calibration_model import apply_overlay_model, count_trainable_rows, load_overlay_model, train_overlay_model
from stokz_forecast.config import Settings


def _sample_rows() -> list[dict[str, object]]:
    return [
        {
            'ticker': 'AMD',
            'as_of_date': '2026-04-10',
            'target_date': '2026-04-11',
            'predicted_return': 0.010,
            'base_predicted_return': 0.010,
            'baseline_return': 0.008,
            'realized_volatility': 0.020,
            'short_trend': 0.015,
            'medium_trend': 0.045,
            'days_to_earnings': 5,
            'news_score': 2,
            'community_score': 1,
            'event_risk': 'moderate',
            'event_risk_score': 1,
            'direction_score': 1,
            'actual_return_1d': 0.020,
            'delta_return_target': 0.010,
            'hit_label': 1,
            'event_risk_target': 'moderate',
        },
        {
            'ticker': 'SMCI',
            'as_of_date': '2026-04-10',
            'target_date': '2026-04-11',
            'predicted_return': -0.008,
            'base_predicted_return': -0.008,
            'baseline_return': -0.006,
            'realized_volatility': 0.030,
            'short_trend': -0.012,
            'medium_trend': -0.030,
            'days_to_earnings': 12,
            'news_score': -1,
            'community_score': -2,
            'event_risk': 'high',
            'event_risk_score': 2,
            'direction_score': -1,
            'actual_return_1d': -0.018,
            'delta_return_target': -0.010,
            'hit_label': 1,
            'event_risk_target': 'high',
        },
        {
            'ticker': 'NVDA',
            'as_of_date': '2026-04-10',
            'target_date': '2026-04-11',
            'predicted_return': 0.006,
            'base_predicted_return': 0.006,
            'baseline_return': 0.004,
            'realized_volatility': 0.018,
            'short_trend': 0.009,
            'medium_trend': 0.018,
            'days_to_earnings': 18,
            'news_score': 0,
            'community_score': 1,
            'event_risk': 'low',
            'event_risk_score': 0,
            'direction_score': 1,
            'actual_return_1d': 0.001,
            'delta_return_target': -0.005,
            'hit_label': 0,
            'event_risk_target': 'low',
        },
        {
            'ticker': 'META',
            'as_of_date': '2026-04-10',
            'target_date': '2026-04-11',
            'predicted_return': -0.005,
            'base_predicted_return': -0.005,
            'baseline_return': -0.004,
            'realized_volatility': 0.022,
            'short_trend': -0.004,
            'medium_trend': -0.015,
            'days_to_earnings': 9,
            'news_score': -1,
            'community_score': 0,
            'event_risk': 'moderate',
            'event_risk_score': 1,
            'direction_score': -1,
            'actual_return_1d': -0.002,
            'delta_return_target': 0.003,
            'hit_label': 1,
            'event_risk_target': 'moderate',
        },
    ]


def _partially_trainable_rows() -> list[dict[str, object]]:
    rows = _sample_rows()
    rows[2].pop('hit_label', None)
    rows[3].pop('event_risk_target', None)
    return rows


def test_count_trainable_rows_requires_valid_explicit_delta_return_target():
    rows = _sample_rows()
    rows[0]['delta_return_target'] = 'invalid-target'

    assert count_trainable_rows(rows) == 3


def test_count_trainable_rows_excludes_invalid_derived_delta_return_inputs():
    rows = _sample_rows()

    rows[0].pop('delta_return_target', None)
    rows[0]['actual_return_1d'] = 'bad'

    rows[1].pop('delta_return_target', None)
    rows[1]['base_predicted_return'] = 'bad'

    rows[2].pop('delta_return_target', None)
    rows[2]['actual_return_1d'] = 'nan'

    assert count_trainable_rows(rows) == 1


def test_count_trainable_rows_excludes_non_finite_feature_values():
    rows = _sample_rows()
    rows[0]['predicted_return'] = 'nan'
    rows[1]['realized_volatility'] = float('inf')

    assert count_trainable_rows(rows) == 2


def test_train_overlay_model_writes_json_artifact(tmp_path: Path):
    output_path = tmp_path / 'models' / 'calibration-model.json'

    artifact = train_overlay_model(_sample_rows(), output_path)

    assert output_path.exists()
    payload = json.loads(output_path.read_text(encoding='utf-8'))
    assert artifact == payload
    assert payload['version'] == 1
    assert payload['row_count'] == 4
    assert payload['trained_at']
    assert payload['feature_names']
    assert set(payload['coefficients']) >= {'delta_return', 'delta_confidence'}
    assert set(payload['metrics']) >= {'delta_return_mae', 'delta_confidence_mae'}
    assert set(payload['thresholds']) >= {'confidence_delta', 'event_risk'}


def test_apply_overlay_model_returns_adjusted_outputs_and_reason_codes(tmp_path: Path):
    artifact = train_overlay_model(_sample_rows(), tmp_path / 'models' / 'calibration-model.json')
    feature_snapshot = build_feature_snapshot(
        ticker='AMD',
        as_of_date='2026-04-10',
        target_date='2026-04-11',
        predicted_return=0.010,
        baseline_return=0.008,
        realized_volatility=0.020,
        short_trend=0.015,
        medium_trend=0.045,
        days_to_earnings=5,
        news_score=2,
        community_score=1,
        predicted_direction='bullish',
        event_risk='moderate',
        news_count=3,
        community_count=2,
    )

    overlay = apply_overlay_model(artifact, feature_snapshot, base_predicted_return=0.010)

    assert set(overlay) == {
        'adjusted_predicted_return',
        'adjusted_confidence_score',
        'event_risk',
        'calibration_reason_codes',
    }
    assert np.isfinite(overlay['adjusted_predicted_return'])
    assert 0.0 <= overlay['adjusted_confidence_score'] <= 1.0
    assert overlay['event_risk'] in {'low', 'moderate', 'high'}
    assert overlay['calibration_reason_codes']


def test_load_overlay_model_handles_missing_and_invalid_json(tmp_path: Path):
    missing_path = tmp_path / 'missing.json'
    assert load_overlay_model(missing_path) is None

    invalid_path = tmp_path / 'invalid.json'
    invalid_path.write_text('{not-json}', encoding='utf-8')
    assert load_overlay_model(invalid_path) is None


def test_load_overlay_model_reads_valid_artifact(tmp_path: Path):
    output_path = tmp_path / 'models' / 'calibration-model.json'
    expected = train_overlay_model(_sample_rows(), output_path)

    loaded = load_overlay_model(output_path)

    assert loaded == expected
    assert loaded is not None
    assert loaded['row_count'] == 4


def test_calibration_train_refuses_when_below_minimum_rows(monkeypatch, tmp_path: Path, capsys):
    history_path = tmp_path / 'history' / 'calibration-history.json'
    history_path.parent.mkdir(parents=True, exist_ok=True)
    history_path.write_text(json.dumps(_sample_rows()[:2], indent=2), encoding='utf-8')

    model_path = tmp_path / 'models' / 'calibration-model.json'
    settings = Settings(
        calibration_history_path=history_path,
        calibration_model_path=model_path,
        calibration_min_training_rows=3,
    )
    monkeypatch.setattr(cli, 'load_settings', lambda: settings)

    exit_code = cli.main(['calibration-train'])

    assert exit_code == 1
    assert not model_path.exists()
    output = capsys.readouterr().out
    assert 'Insufficient trainable rows' in output
    assert 'required=3' in output


def test_calibration_train_refuses_when_labeled_rows_include_non_trainable_rows(monkeypatch, tmp_path: Path, capsys):
    history_path = tmp_path / 'history' / 'calibration-history.json'
    history_path.parent.mkdir(parents=True, exist_ok=True)
    history_path.write_text(json.dumps(_partially_trainable_rows(), indent=2), encoding='utf-8')

    model_path = tmp_path / 'models' / 'calibration-model.json'
    settings = Settings(
        calibration_history_path=history_path,
        calibration_model_path=model_path,
        calibration_min_training_rows=3,
    )
    monkeypatch.setattr(cli, 'load_settings', lambda: settings)

    exit_code = cli.main(['calibration-train'])

    assert exit_code == 1
    assert not model_path.exists()
    output = capsys.readouterr().out
    assert 'Insufficient trainable rows' in output
    assert 'available=2' in output
    assert 'required=3' in output


def test_calibration_train_writes_model_when_threshold_is_met(monkeypatch, tmp_path: Path, capsys):
    history_path = tmp_path / 'history' / 'calibration-history.json'
    history_path.parent.mkdir(parents=True, exist_ok=True)
    history_path.write_text(json.dumps(_sample_rows(), indent=2), encoding='utf-8')

    model_path = tmp_path / 'models' / 'calibration-model.json'
    settings = Settings(
        calibration_history_path=history_path,
        calibration_model_path=model_path,
        calibration_min_training_rows=3,
    )
    monkeypatch.setattr(cli, 'load_settings', lambda: settings)

    exit_code = cli.main(['calibration-train'])

    assert exit_code == 0
    assert model_path.exists()
    payload = json.loads(model_path.read_text(encoding='utf-8'))
    assert payload['row_count'] == 4
    assert payload['version'] == 1
    output = capsys.readouterr().out
    assert 'Calibration model trained' in output


def test_calibration_train_handles_model_fit_failure_cleanly(monkeypatch, tmp_path: Path, capsys):
    history_path = tmp_path / 'history' / 'calibration-history.json'
    history_path.parent.mkdir(parents=True, exist_ok=True)
    history_path.write_text(json.dumps(_sample_rows(), indent=2), encoding='utf-8')

    model_path = tmp_path / 'models' / 'calibration-model.json'
    settings = Settings(
        calibration_history_path=history_path,
        calibration_model_path=model_path,
        calibration_min_training_rows=3,
    )
    monkeypatch.setattr(cli, 'load_settings', lambda: settings)

    def _raise_linalg_error(*_args, **_kwargs):
        raise np.linalg.LinAlgError('SVD did not converge')

    monkeypatch.setattr(cli, 'train_overlay_model', _raise_linalg_error)

    exit_code = cli.main(['calibration-train'])

    assert exit_code == 1
    assert not model_path.exists()
    output = capsys.readouterr().out
    assert 'Calibration training failed:' in output
    assert 'SVD did not converge' in output
