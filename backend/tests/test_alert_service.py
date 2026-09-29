import math
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.schemas.alerts import AlertSeverity, AlertThresholds
from app.services.alert_service import AlertService, classify_absolute_residual
from app.services.collocation_service import CollocationService


def collocation(pairs, status="eligible"):
    return {
        "profile_id": "1234567-8",
        "status": status,
        "observation_time": "2026-09-18T12:00:00",
        "model_time": "2026-09-18T18:00:00",
        "time_difference_hours": 6.0,
        "observation_latitude": 16.2,
        "observation_longitude": 88.4,
        "model_latitude": 16.25,
        "model_longitude": 88.4167,
        "spatial_distance_km": 5.8,
        "matched_pair_count": len(pairs),
        "pairs": pairs,
        "method": "model-level-centric vertical matching",
        "provenance": {"provider": "test fixture"},
    }


def pair(observation, model, depth=10.0):
    return {
        "model_depth_m": depth,
        "observation_depth_m": depth + 0.2,
        "vertical_gap_m": 0.2,
        "pressure_dbar": depth + 0.4,
        "observation_potential_temperature_c": observation,
        "model_thetao_c": model,
        "residual_c": model - observation,
    }


class FakeCollocationService:
    def __init__(self, result):
        self.result = result
        self.argo_service = FakeArgoService()
        self.calls = 0

    def collocate_profile(self, profile_id):
        self.calls += 1
        return {**self.result, "profile_id": profile_id}


class FakeArgoService:
    profile = {
        "profile_id": "1234567-8",
        "platform_number": "1234567",
        "observation_time": "2026-09-18T12:00:00",
        "latitude": 16.2,
        "longitude": 88.4,
    }

    def get_argo_profile(self, profile_id):
        if profile_id == "missing-1":
            return None
        return {"summary": {**self.profile, "profile_id": profile_id}, "levels": []}

    def get_argo_profiles(self):
        return [self.profile]


def make_service(result):
    collocator = FakeCollocationService(result)
    return AlertService(collocation_service=collocator, argo_service=collocator.argo_service), collocator


@pytest.mark.parametrize(
    ("absolute_residual", "expected"),
    [
        (0.0, AlertSeverity.normal),
        (0.499999, AlertSeverity.normal),
        (0.5, AlertSeverity.moderate),
        (0.999999, AlertSeverity.moderate),
        (1.0, AlertSeverity.high),
    ],
)
def test_threshold_boundaries(absolute_residual, expected):
    assert classify_absolute_residual(absolute_residual) == expected


def test_residual_direction_absolute_value_and_profile_summary():
    service, _ = make_service(collocation([
        pair(20.8, 20.0, 10.0),
        pair(19.0, 19.3, 30.0),
        pair(17.0, 18.2, 50.0),
    ]))
    detail = service.profile_alert("1234567-8")

    assert [alert.residual for alert in detail.alerts] == pytest.approx([0.8, -0.3, -1.2])
    assert [alert.absolute_residual for alert in detail.alerts] == pytest.approx([0.8, 0.3, 1.2])
    assert detail.summary.severity == AlertSeverity.high
    assert detail.summary.normal_count == 1
    assert detail.summary.moderate_count == 1
    assert detail.summary.high_count == 1
    assert detail.summary.maximum_absolute_residual == pytest.approx(1.2)
    assert detail.summary.residual_at_maximum == pytest.approx(-1.2)
    assert detail.summary.depth_of_maximum_residual == pytest.approx(50.2)
    assert detail.summary.bias == pytest.approx((-0.7) / 3)
    assert detail.summary.rmse == pytest.approx(math.sqrt((0.64 + 0.09 + 1.44) / 3))
    assert detail.summary.mae == pytest.approx(2.3 / 3)


def test_profile_severity_moderate_without_high_pair():
    service, _ = make_service(collocation([pair(20.5, 20.0), pair(19.9, 20.0)]))
    assert service.profile_alert("1234567-8").summary.severity == AlertSeverity.moderate


@pytest.mark.parametrize("status", ["no_vertical_overlap", "no_valid_pairs", "outside_time_tolerance"])
def test_zero_pairs_are_not_assessable(status):
    service, _ = make_service(collocation([], status=status))
    detail = service.profile_alert("1234567-8")
    assert detail.summary.severity == AlertSeverity.not_assessable
    assert detail.summary.matched_pair_count == 0
    assert detail.summary.maximum_absolute_residual is None
    assert detail.summary.not_assessable_reason
    assert detail.alerts == []


def test_filtering_uses_cached_results():
    service, collocator = make_service(collocation([pair(21.2, 20.0)]))
    assert len(service.list_profile_alerts(severity=AlertSeverity.high)) == 1
    assert service.list_profile_alerts(severity=AlertSeverity.normal) == []
    assert service.list_profile_alerts(platform_id="different") == []
    assert collocator.calls == 1


def test_threshold_configuration_serialization():
    thresholds = AlertThresholds(normal_max_c=0.4, moderate_max_c=0.9)
    service, _ = make_service(collocation([pair(20.5, 20.0)]))
    service = AlertService(
        collocation_service=service.collocation_service,
        argo_service=service.argo_service,
        thresholds=thresholds,
    )
    detail = service.profile_alert("1234567-8")
    assert detail.thresholds.model_dump() == {
        "normal_max_c": 0.4,
        "moderate_max_c": 0.9,
        "label": "Prototype model-observation deviation thresholds",
    }
    assert detail.alerts[0].severity == AlertSeverity.moderate


def test_locked_collocation_baselines_remain_unchanged():
    collocator = CollocationService()
    try:
        first = collocator.collocate_profile("2903831-65")
        second = collocator.collocate_profile("7902073-42")
        third = collocator.collocate_profile("4903869-57")
    finally:
        collocator.close()

    assert first["matched_pair_count"] == 25
    assert first["bias_c"] == pytest.approx(-0.2145, abs=0.001)
    assert first["rmse_c"] == pytest.approx(0.3848, abs=0.001)
    assert first["mae_c"] == pytest.approx(0.2642, abs=0.001)
    assert second["matched_pair_count"] == 19
    assert second["bias_c"] == pytest.approx(-0.3762, abs=0.001)
    assert second["rmse_c"] == pytest.approx(0.6344, abs=0.001)
    assert second["mae_c"] == pytest.approx(0.4841, abs=0.001)
    assert third["status"] == "no_vertical_overlap"
    assert third["matched_pair_count"] == 0
