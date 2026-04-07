from __future__ import annotations

from dataclasses import dataclass, replace
import importlib
from typing import Any

import numpy as np

from .baselines import predict_rolling_mean


@dataclass(frozen=True)
class TimesFMRuntimeStatus:
    mode: str
    backend: str
    runtime_class: str | None = None
    model_path: str | None = None
    repo_id: str | None = None
    reason: str | None = None


class TimesFMAdapter:
    def __init__(
        self,
        backend: str = 'placeholder',
        model_path: str | None = None,
        repo_id: str | None = None,
        horizon: int = 1,
    ) -> None:
        self.backend = backend
        self.model_path = model_path
        self.repo_id = repo_id
        self.horizon = max(1, horizon)
        self._runtime: Any = None
        self._forecast_config: Any = None
        self.status = self._initialize_runtime()

    @property
    def model_name(self) -> str:
        return 'timesfm' if self.status.mode == 'timesfm' else 'timesfm-fallback'

    def forecast_next_return(self, history: list[float]) -> float:
        if not history:
            return 0.0

        if self.status.mode != 'timesfm' or self._runtime is None:
            return predict_rolling_mean(history, window=min(5, len(history)))

        try:
            raw_forecast = self._call_runtime(history)
            return self._extract_scalar(raw_forecast)
        except Exception as exc:
            self.status = replace(self.status, mode='fallback', reason=f'runtime_error:{exc.__class__.__name__}')
            self._runtime = None
            return predict_rolling_mean(history, window=min(5, len(history)))

    def _initialize_runtime(self) -> TimesFMRuntimeStatus:
        if self.backend != 'timesfm':
            return TimesFMRuntimeStatus(
                mode='fallback',
                backend=self.backend,
                model_path=self.model_path,
                repo_id=self.repo_id,
                reason='backend_disabled',
            )

        try:
            module = importlib.import_module('timesfm')
        except Exception as exc:
            return TimesFMRuntimeStatus(
                mode='fallback',
                backend=self.backend,
                model_path=self.model_path,
                repo_id=self.repo_id,
                reason=f'import_failed:{exc.__class__.__name__}',
            )

        runtime, runtime_class, reason = self._resolve_runtime(module)
        if runtime is None:
            return TimesFMRuntimeStatus(
                mode='fallback',
                backend=self.backend,
                model_path=self.model_path,
                repo_id=self.repo_id,
                reason=reason or 'runtime_unavailable',
            )

        self._runtime = runtime
        return TimesFMRuntimeStatus(
            mode='timesfm',
            backend=self.backend,
            runtime_class=runtime_class,
            model_path=self.model_path,
            repo_id=self.repo_id,
            reason='ok',
        )

    def _resolve_runtime(self, module: Any) -> tuple[Any | None, str | None, str | None]:
        runtime = self._try_timesfm_2p5_torch(module)
        if runtime is not None:
            return runtime, 'TimesFM_2p5_200M_torch', None

        for class_name in ('TimesFm', 'TimesFM'):
            runtime_class = getattr(module, class_name, None)
            if runtime_class is None:
                continue
            runtime = self._instantiate_legacy_runtime(runtime_class, module)
            if runtime is not None:
                return runtime, class_name, None

        return None, None, 'runtime_unavailable'

    def _try_timesfm_2p5_torch(self, module: Any) -> Any | None:
        try:
            torch_module = importlib.import_module('timesfm.timesfm_2p5.timesfm_2p5_torch')
            runtime_class = getattr(torch_module, 'TimesFM_2p5_200M_torch', None)
            forecast_config_factory = getattr(module, 'ForecastConfig', None)
            if runtime_class is None or forecast_config_factory is None:
                return None

            pretrained_ref = self.repo_id or self.model_path or 'google/timesfm-2.5-200m-pytorch'
            runtime = runtime_class.from_pretrained(pretrained_ref)
            self._forecast_config = forecast_config_factory(
                max_context=1024,
                max_horizon=max(16, self.horizon),
                normalize_inputs=True,
                use_continuous_quantile_head=True,
                force_flip_invariance=True,
                infer_is_positive=False,
                fix_quantile_crossing=True,
            )
            runtime.compile(self._forecast_config)
            return runtime
        except Exception:
            return None

    def _instantiate_legacy_runtime(self, runtime_class: Any, module: Any) -> Any | None:
        checkpoint_factory = getattr(module, 'TimesFmCheckpoint', None)
        hparams_factory = getattr(module, 'TimesFmHparams', None)
        attempts: list[dict[str, Any]] = []

        if checkpoint_factory is not None and hparams_factory is not None:
            try:
                checkpoint = checkpoint_factory(
                    huggingface_repo_id=self.repo_id,
                    checkpoint_path=self.model_path,
                )
                hparams = hparams_factory(horizon_len=self.horizon)
                attempts.append({'hparams': hparams, 'checkpoint': checkpoint})
            except Exception:
                pass

        attempts.extend(({}, {'model_path': self.model_path}, {'repo_id': self.repo_id}, {'checkpoint_path': self.model_path}))

        for kwargs in attempts:
            try:
                return runtime_class(**kwargs)
            except Exception:
                continue
        return None

    def _call_runtime(self, history: list[float]) -> Any:
        history_array = np.asarray(history, dtype=np.float32)

        if hasattr(self._runtime, 'forecast'):
            method = getattr(self._runtime, 'forecast')
            attempts = [
                lambda: method(horizon=self.horizon, inputs=[history_array]),
                lambda: method(horizon=self.horizon, inputs=[history_array.tolist()]),
                lambda: method(self.horizon, [history_array]),
            ]
            for attempt in attempts:
                try:
                    return attempt()
                except TypeError:
                    continue
                except Exception:
                    continue
        return None

    def _extract_scalar(self, payload: Any) -> float:
        if payload is None:
            raise ValueError('Received empty TimesFM payload')
        if isinstance(payload, (int, float, np.floating, np.integer)):
            return float(payload)
        if hasattr(payload, 'tolist') and not isinstance(payload, (list, tuple, dict)):
            return self._extract_scalar(payload.tolist())
        if isinstance(payload, dict):
            for key in ('forecast', 'predictions', 'mean', 'result', 'values'):
                if key in payload:
                    return self._extract_scalar(payload[key])
            if payload:
                return self._extract_scalar(next(iter(payload.values())))
        if isinstance(payload, tuple):
            if not payload:
                raise ValueError('Received empty TimesFM tuple payload')
            return self._extract_scalar(payload[0])
        if isinstance(payload, list):
            if not payload:
                raise ValueError('Received empty TimesFM list payload')
            return self._extract_scalar(payload[0])
        raise TypeError(f'Unsupported TimesFM payload type: {type(payload)!r}')
