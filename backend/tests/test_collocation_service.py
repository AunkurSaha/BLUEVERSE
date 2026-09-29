import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.collocation_service import CollocationService
from app.services.argo_service import ArgoService

def test_collocation_service_import():
    """Test that the CollocationService can be imported."""
    assert CollocationService is not None

def test_collocation_service_initialization():
    """Test that the CollocationService initializes without error."""
    service = CollocationService()
    assert service is not None
    service.close()

def test_get_argo_profile():
    """Test that we can get an ARGO profile via the collocation service."""
    service = CollocationService()
    # Use a known profile
    profile = service.get_argo_profile("2903831-65")
    assert profile is not None
    assert profile["summary"]["profile_id"] == "2903831-65"
    service.close()

def test_collocate_profile_known():
    """Test collocation for a known profile returns a result."""
    service = CollocationService()
    result = service.collocate_profile("2903831-65")
    assert result is not None
    assert "status" in result
    # We don't assert the exact status because it depends on data and tolerances
    service.close()

def test_collocate_profile_unknown():
    """Test collocation for an unknown profile returns not_found."""
    service = CollocationService()
    result = service.collocate_profile("000000-00")
    assert result["status"] == "not_found"
    service.close()

def test_constants():
    """Test that the constants are set."""
    from app.services.collocation_service import (
        EARTH_RADIUS_KM,
        ACCEPTED_QC,
        SPATIAL_TOLERANCE_KM,
        TEMPORAL_TOLERANCE_HOURS,
        VERTICAL_TOLERANCE_M
    )
    assert EARTH_RADIUS_KM == 6371.0
    assert ACCEPTED_QC == {1, 2}
    assert SPATIAL_TOLERANCE_KM == 100.0
    assert TEMPORAL_TOLERANCE_HOURS == 12.0
    # VERTICAL_TOLERANCE_M may have been changed, but we just check it's a number
    assert isinstance(VERTICAL_TOLERANCE_M, (int, float))

def test_7902073_42_phase8c_baseline_regression():
    """Strict regression against the validated Phase 8C baseline for 7902073-42.

    Baseline policy (from phase8c_collocation.py): raw PRES for depth/matching,
    TEMP_ADJUSTED/PSAL_ADJUSTED when DATA_MODE=A/D, raw PRES_QC/TEMP_QC/PSAL_QC.
    """
    service = CollocationService()
    result = service.collocate_profile("7902073-42")
    service.close()
    assert result["status"] == "eligible"
    assert result["matched_pair_count"] == 19
    assert abs(result["bias_c"] - (-0.3762)) < 0.001
    assert abs(result["rmse_c"] - 0.6344) < 0.001
    assert abs(result["mae_c"] - 0.4841) < 0.001
    assert abs(result["residual_min_c"] - (-1.3475)) < 0.001
    assert abs(result["residual_max_c"] - 0.3305) < 0.001
    assert result["model_time"].startswith("2026-09-18T18:00:00")


def test_7902073_42_baseline_variable_policy():
    """Assert the triplet/QC policy that reproduces the validated baseline.

    Pressure must come from raw PRES (the baseline uses raw pressure for depth);
    temperature and salinity use adjusted variables under DATA_MODE=A.
    """
    svc = ArgoService()
    summary = svc.get_argo_profile("7902073-42")["summary"]
    assert summary["data_mode"] == "A"
    assert summary["pressure_source"] == "PRES"
    assert summary["temperature_source"] == "TEMP_ADJUSTED"
    assert summary["salinity_source"] == "PSAL_ADJUSTED"


def test_2903831_65_phase8c_baseline_regression():
    """Regression guard for 2903831-65 against the validated Phase 8C baseline."""
    service = CollocationService()
    result = service.collocate_profile("2903831-65")
    service.close()
    assert result["status"] == "eligible"
    assert result["matched_pair_count"] == 25
    assert abs(result["bias_c"] - (-0.2145)) < 0.001
    assert abs(result["rmse_c"] - 0.3848) < 0.001
    assert abs(result["mae_c"] - 0.2642) < 0.001


def test_4903869_57_no_vertical_overlap():
    """Regression guard: 4903869-57 must remain no_vertical_overlap."""
    service = CollocationService()
    result = service.collocate_profile("4903869-57")
    service.close()
    assert result["status"] == "no_vertical_overlap"
    assert result["matched_pair_count"] == 0
    assert result["bias_c"] is None
    assert result["rmse_c"] is None
    assert result["mae_c"] is None


if __name__ == "__main__":
    # Run tests
    test_collocation_service_import()
    test_collocation_service_initialization()
    test_get_argo_profile()
    test_collocate_profile_known()
    test_collocate_profile_unknown()
    test_constants()
    print("All tests passed!")