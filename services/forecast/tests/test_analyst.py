from stokz_forecast.analyst import evaluate_tomorrow_adjustments


def test_analyst_defers_when_sample_count_is_too_small():
    decision = evaluate_tomorrow_adjustments(
        horizon_summary={1: {'hit_rate': 0.42, 'mae': 0.03, 'samples': 1.0}},
        proposed_adjustments=[{'parameter': 'buy_threshold', 'direction': 'tighten'}],
    )

    assert decision.decision == 'defer'
    assert len(decision.deferred_adjustments) == 1


def test_analyst_partially_approves_when_one_adjustment_is_supported():
    decision = evaluate_tomorrow_adjustments(
        horizon_summary={
            1: {'hit_rate': 0.44, 'mae': 0.02, 'samples': 5.0},
            3: {'hit_rate': 0.49, 'mae': 0.03, 'samples': 5.0},
        },
        proposed_adjustments=[
            {'parameter': 'buy_threshold', 'direction': 'tighten'},
            {'parameter': 'horizon_weight_3d', 'direction': 'downweight'},
        ],
    )

    assert decision.decision in {'approve', 'partial'}
    assert len(decision.approved_adjustments) >= 1
