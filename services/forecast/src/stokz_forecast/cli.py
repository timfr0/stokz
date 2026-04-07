from __future__ import annotations

import argparse
import json
from pathlib import Path

from .config import load_settings
from .notifications import build_delivery_summary
from .pipeline import build_dashboard_artifacts, build_demo_batch, write_dashboard_artifacts
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

    subparsers.add_parser('runtime-status', help='Print TimesFM runtime status and fallback reason')

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
    if args.command == 'runtime-status':
        return runtime_status()

    parser.error(f'Unknown command: {args.command}')
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
