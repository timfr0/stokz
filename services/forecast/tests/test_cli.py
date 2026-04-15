import json
from datetime import date
from pathlib import Path

import pandas as pd

from stokz_forecast import cli
from stokz_forecast.config import Settings


def test_build_parser_accepts_calibration_commands():
    parser = cli.build_parser()

    status_args = parser.parse_args(['calibration-status'])
    backfill_args = parser.parse_args(['calibration-backfill', '--end-date', '2026-04-15'])

    assert status_args.command == 'calibration-status'
    assert backfill_args.command == 'calibration-backfill'
    assert backfill_args.end_date == date(2026, 4, 15)


def test_calibration_status_prints_row_counts(monkeypatch, tmp_path: Path, capsys):
    history_path = tmp_path / 'history' / 'calibration-history.json'
    history_path.parent.mkdir(parents=True, exist_ok=True)
    history_path.write_text(
        json.dumps([
            {'ticker': 'AMD', 'as_of_date': '2026-04-10', 'target_date': '2026-04-11'},
            {'ticker': 'SMCI', 'as_of_date': '2026-04-11', 'target_date': '2026-04-12', 'actual_return_1d': 0.01},
        ]),
        encoding='utf-8',
    )
    model_path = tmp_path / 'models' / 'calibration-model.json'
    model_path.parent.mkdir(parents=True, exist_ok=True)
    model_path.write_text('{}', encoding='utf-8')

    settings = Settings(calibration_history_path=history_path, calibration_model_path=model_path)
    monkeypatch.setattr(cli, 'load_settings', lambda: settings)

    assert cli.calibration_status() == 0
    output = capsys.readouterr().out
    assert 'feature_row_count=2' in output
    assert 'labeled_row_count=1' in output
    assert 'model_artifact_exists=True' in output


def test_calibration_backfill_updates_unresolved_rows(monkeypatch, tmp_path: Path, capsys):
    history_path = tmp_path / 'history' / 'calibration-history.json'
    history_path.parent.mkdir(parents=True, exist_ok=True)
    history_path.write_text(
        json.dumps([
            {
                'ticker': 'AMD',
                'as_of_date': '2026-04-10',
                'target_date': '2026-04-11',
                'predicted_return': 0.01,
                'base_predicted_return': 0.01,
                'realized_volatility': 0.015,
            }
        ]),
        encoding='utf-8',
    )
    settings = Settings(calibration_history_path=history_path)
    monkeypatch.setattr(cli, 'load_settings', lambda: settings)
    monkeypatch.setattr(
        cli,
        'load_daily_bars',
        lambda **kwargs: pd.DataFrame(
            [
                {'ticker': 'AMD', 'trade_date': '2026-04-10', 'close': 100.0},
                {'ticker': 'AMD', 'trade_date': '2026-04-11', 'close': 108.0},
            ]
        ),
    )

    assert cli.calibration_backfill(end_date=date(2026, 4, 11)) == 0
    output = capsys.readouterr().out
    updated_rows = json.loads(history_path.read_text(encoding='utf-8'))

    assert 'resolved_rows=1' in output
    assert updated_rows[0]['actual_return_1d'] > 0
    assert updated_rows[0]['hit_label'] == 1
