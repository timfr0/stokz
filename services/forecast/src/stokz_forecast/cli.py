from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

from .calibration_history import attach_realized_outcomes, read_feature_rows, summarize_feature_history, write_labeled_rows
from .calibration_model import train_overlay_model
from .config import load_settings
from .data_sources import load_daily_bars
from .notifications import build_delivery_summary
from .pipeline import build_dashboard_artifacts, build_demo_batch, write_dashboard_artifacts
from .reviews import build_daily_review, write_daily_review_artifacts
from .stock_details import write_stock_detail_artifacts
from .timesfm_adapter import TimesFMAdapter


def _generated_dir() -> Path:
    return Path(__file__).resolve().parents[2] / 'generated'


def _default_export_path() -> Path:
    return _generated_dir() / 'demo-forecasts.json'


def run_demo() -> int:
    settings = load_settings()
    print('Stokz forecast demo')
    print(f'Backend: {settings.timesfm_backend}')
    print(f'Universe ({len(settings.ticker_universe)}): {", ".join(settings.ticker_universe)}')
    print('Placeholder forecast run scaffold is ready.')
    return 0


def export_demo(output_path: Path | None = None) -> int:
    batch = build_demo_batch()
    destination = output_path or _default_export_path()
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(batch.to_records(), indent=2), encoding='utf-8')
    print(f'Wrote {len(batch.predictions)} demo forecasts to {destination}')
    return 0


def export_artifacts(output_dir: Path | None = None) -> int:
    artifacts = build_dashboard_artifacts()
    paths = write_dashboard_artifacts(artifacts, output_dir=output_dir or _generated_dir())
    print(f'Wrote {len(artifacts.setups)} setups to {paths["setups"]}')
    print(f'Wrote {len(artifacts.chart_series)} chart series to {paths["charts"]}')
    print(f'Generated {len(artifacts.notification_events)} actionable notification events')
    return 0


def daily_refresh(output_dir: Path | None = None) -> int:
    artifacts = build_dashboard_artifacts()
    paths = write_dashboard_artifacts(artifacts, output_dir=output_dir or _generated_dir())
    print(f'Daily refresh complete. Setups: {len(artifacts.setups)}, notifications: {len(artifacts.notification_events)}')
    print(build_delivery_summary(artifacts.setups))
    print(f'Artifacts: {paths["setups"]} | {paths["charts"]} | {paths["notifications"]}')
    return 0


def daily_review(output_dir: Path | None = None) -> int:
    destination = output_dir or _generated_dir()
    artifacts = build_dashboard_artifacts()
    write_dashboard_artifacts(artifacts, output_dir=destination)
    review = build_daily_review(artifacts, base_dir=destination)
    paths = write_daily_review_artifacts(review, base_dir=destination)
    stock_detail_path = write_stock_detail_artifacts(artifacts, base_dir=destination)
    print(f"Daily review complete for {review['reviewDate']}")
    print(review['analystDecision'])
    print(f"Review artifacts: {paths['index']} | {paths['summary']} | {paths['report']} | {stock_detail_path}")
    return 0


def publish_site_data(output_dir: Path | None = None) -> int:
    destination = output_dir or _generated_dir()
    artifacts = build_dashboard_artifacts()
    dashboard_paths = write_dashboard_artifacts(artifacts, output_dir=destination)
    review = build_daily_review(artifacts, base_dir=destination)
    review_paths = write_daily_review_artifacts(review, base_dir=destination)
    stock_detail_path = write_stock_detail_artifacts(artifacts, base_dir=destination)
    print(f"Publish-ready refresh complete for {review['reviewDate']}")
    print(build_delivery_summary(artifacts.setups))
    print(review['operatorSummary'])
    print(
        f"Artifacts: {dashboard_paths['setups']} | {dashboard_paths['charts']} | {dashboard_paths['notifications']} | {review_paths['index']} | {review_paths['report']} | {stock_detail_path}"
    )
    return 0


def runtime_status() -> int:
    settings = load_settings()
    adapter = TimesFMAdapter(
        backend=settings.timesfm_backend,
        model_path=settings.timesfm_model_path,
        repo_id=settings.timesfm_repo_id,
        horizon=settings.forecast_horizon_days,
    )
    print(f'backend={settings.timesfm_backend}')
    print(f'mode={adapter.status.mode}')
    print(f'model_name={adapter.model_name}')
    print(f'reason={adapter.status.reason or "ok"}')
    print(f'model_path={adapter.status.model_path or "n/a"}')
    print(f'repo_id={adapter.status.repo_id or "n/a"}')
    print(f'runtime_class={adapter.status.runtime_class or "n/a"}')
    return 0


def calibration_status() -> int:
    settings = load_settings()
    rows = read_feature_rows(settings.calibration_history_path)
    summary = summarize_feature_history(rows)
    print(f'calibration_history={settings.calibration_history_path}')
    print(f'feature_row_count={summary["feature_row_count"]}')
    print(f'labeled_row_count={summary["labeled_row_count"]}')
    print(f'latest_as_of_date={summary["latest_as_of_date"] or "n/a"}')
    print(f'model_artifact_exists={settings.calibration_model_path.exists()}')
    return 0


def calibration_backfill(end_date: date | None = None) -> int:
    settings = load_settings()
    rows = read_feature_rows(settings.calibration_history_path)
    if not rows:
        print(f'No calibration history rows found at {settings.calibration_history_path}')
        return 0

    unresolved_rows = [row for row in rows if row.get('actual_return_1d') is None]
    if not unresolved_rows:
        print(f'No unresolved calibration rows found at {settings.calibration_history_path}')
        return 0

    effective_end = end_date or date.today()
    tickers = sorted({str(row.get('ticker', '')).upper() for row in unresolved_rows if row.get('ticker')})
    earliest_as_of = min(date.fromisoformat(str(row['as_of_date'])) for row in unresolved_rows if row.get('as_of_date'))
    lookback_days = max(10, (effective_end - earliest_as_of).days + 10)
    price_frame = load_daily_bars(
        tickers=tickers,
        lookback_days=lookback_days,
        end_date=effective_end,
        auto_adjust=settings.data_auto_adjust,
    )

    before_summary = summarize_feature_history(rows)
    updated_rows = attach_realized_outcomes(rows, price_frame)
    write_labeled_rows(settings.calibration_history_path, updated_rows)
    after_summary = summarize_feature_history(updated_rows)
    resolved_count = after_summary['labeled_row_count'] - before_summary['labeled_row_count']
    print(f'Calibration backfill complete through {effective_end.isoformat()}')
    print(f'resolved_rows={resolved_count}')
    print(f'calibration_history={settings.calibration_history_path}')
    return 0


def calibration_train() -> int:
    settings = load_settings()
    rows = read_feature_rows(settings.calibration_history_path)
    labeled_rows = [row for row in rows if row.get('actual_return_1d') is not None]
    labeled_count = len(labeled_rows)

    if labeled_count < settings.calibration_min_training_rows:
        print(
            f'Insufficient labeled rows for calibration training: available={labeled_count}, required={settings.calibration_min_training_rows}'
        )
        print(f'calibration_history={settings.calibration_history_path}')
        return 1

    try:
        artifact = train_overlay_model(labeled_rows, settings.calibration_model_path)
    except ValueError as exc:
        print(f'Calibration training failed: {exc}')
        return 1

    print('Calibration model trained')
    print(f'row_count={artifact["row_count"]}')
    print(f'calibration_model={settings.calibration_model_path}')
    return 0


def export_setups(output_path: Path | None = None) -> int:
    artifacts = build_dashboard_artifacts()
    destination = output_path or (_generated_dir() / 'portfolio-setups.json')
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps([setup.to_record() for setup in artifacts.setups], indent=2), encoding='utf-8')
    print(f'Wrote {len(artifacts.setups)} setups to {destination}')
    return 0


def export_chart_series(output_path: Path | None = None) -> int:
    artifacts = build_dashboard_artifacts()
    destination = output_path or (_generated_dir() / 'chart-series.json')
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps([series.to_record() for series in artifacts.chart_series], indent=2), encoding='utf-8')
    print(f'Wrote {len(artifacts.chart_series)} chart series to {destination}')
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Stokz forecast service CLI')
    subparsers = parser.add_subparsers(dest='command', required=True)

    subparsers.add_parser('demo', help='Print scaffold status and ticker universe')

    export_parser = subparsers.add_parser('export-demo', help='Export demo forecasts to JSON')
    export_parser.add_argument('--output', type=Path, default=None, help='Optional output path override')

    artifact_parser = subparsers.add_parser('export-artifacts', help='Pull daily data and export dashboard artifacts')
    artifact_parser.add_argument('--output-dir', type=Path, default=None, help='Optional artifact directory override')

    setup_parser = subparsers.add_parser('export-setups', help='Export setup recommendations JSON')
    setup_parser.add_argument('--output', type=Path, default=None, help='Optional output path override')

    chart_parser = subparsers.add_parser('export-chart-series', help='Export chart series JSON')
    chart_parser.add_argument('--output', type=Path, default=None, help='Optional output path override')

    refresh_parser = subparsers.add_parser('daily-refresh', help='Run the full daily refresh and print a delivery summary')
    refresh_parser.add_argument('--output-dir', type=Path, default=None, help='Optional artifact directory override')

    review_parser = subparsers.add_parser('daily-review', help='Refresh artifacts and write the website review archive files')
    review_parser.add_argument('--output-dir', type=Path, default=None, help='Optional artifact directory override')

    publish_parser = subparsers.add_parser('publish-site-data', help='Refresh dashboard artifacts and write review/archive files for GitHub + Vercel')
    publish_parser.add_argument('--output-dir', type=Path, default=None, help='Optional artifact directory override')

    five_parser = subparsers.add_parser('five-pm-report', help='Alias for publish-site-data for after-close publishing')
    five_parser.add_argument('--output-dir', type=Path, default=None, help='Optional artifact directory override')

    subparsers.add_parser('runtime-status', help='Print TimesFM runtime status and fallback reason')
    subparsers.add_parser('calibration-status', help='Print calibration history and model-artifact status')

    backfill_parser = subparsers.add_parser('calibration-backfill', help='Resolve realized outcomes for unresolved calibration rows')
    backfill_parser.add_argument('--end-date', type=date.fromisoformat, default=None, help='Optional end date override (YYYY-MM-DD)')
    subparsers.add_parser('calibration-train', help='Train and write the calibration overlay model artifact')

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == 'demo':
        return run_demo()
    if args.command == 'export-demo':
        return export_demo(output_path=args.output)
    if args.command == 'export-artifacts':
        return export_artifacts(output_dir=args.output_dir)
    if args.command == 'export-setups':
        return export_setups(output_path=args.output)
    if args.command == 'export-chart-series':
        return export_chart_series(output_path=args.output)
    if args.command == 'daily-refresh':
        return daily_refresh(output_dir=args.output_dir)
    if args.command == 'daily-review':
        return daily_review(output_dir=args.output_dir)
    if args.command == 'publish-site-data':
        return publish_site_data(output_dir=args.output_dir)
    if args.command == 'five-pm-report':
        return publish_site_data(output_dir=args.output_dir)
    if args.command == 'runtime-status':
        return runtime_status()
    if args.command == 'calibration-status':
        return calibration_status()
    if args.command == 'calibration-backfill':
        return calibration_backfill(end_date=args.end_date)
    if args.command == 'calibration-train':
        return calibration_train()

    parser.error(f'Unknown command: {args.command}')
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
