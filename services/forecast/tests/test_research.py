from datetime import date, datetime

from stokz_forecast.research import build_research_context, event_risk_label, sentiment_score


def test_sentiment_score_counts_keyword_bias():
    items = [{'title': 'AMD upgrade and strong AI demand', 'summary': 'Bullish setup with buy support'}]
    assert sentiment_score(items) > 0


def test_event_risk_goes_high_when_earnings_are_close():
    assert event_risk_label(days_to_earnings=3, news_bias='supportive', news_items=[], community_items=[]) == 'high'


def test_build_research_context_returns_normalized_payload_without_network_calls():
    context = build_research_context(
        ticker='AMD',
        company_name='Advanced Micro Devices',
        as_of_date=date(2026, 4, 10),
        predicted_direction='bullish',
        calendar={'Earnings Date': [datetime(2026, 4, 15, 12, 0, 0)]},
        news_items=[{'title': 'AMD upgrade', 'summary': 'Strong AI demand'}],
        community_items=[{'title': 'AMD stock bullish thread', 'summary': 'Buy setup discussion'}],
    )

    assert context['earnings_date'] == '2026-04-15'
    assert context['days_to_earnings'] == 5
    assert context['news_score'] > 0
    assert context['community_score'] > 0
    assert context['news_bias'] == 'supportive'
    assert context['event_risk'] == 'high'
