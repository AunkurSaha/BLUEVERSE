import pytest
from backend.app.services.glider_service import DATA_PATH, GliderService

@pytest.fixture(scope="module")
def service():
    value=GliderService(); yield value; value.cleanup()

def test_local_audited_mission_summary(service):
    assert DATA_PATH.is_file()
    data=service.mission_summary()
    assert data["deployment_id"] == "19607101"
    assert data["profile_count"] == 703
    assert data["observation_count"] == 577347
    assert 12 < data["min_latitude"] < 13 < data["max_latitude"] < 17
    assert 85 < data["min_longitude"] < 86 < data["max_longitude"] < 90

def test_contiguous_ragged_profile_mapping(service):
    offsets=service._offsets()
    assert offsets[0] == 0 and offsets[-1] == 577347
    assert all(service._slice(i).stop > service._slice(i).start for i in (0,351,702))

def test_trajectory_is_one_profile_coordinate_per_profile(service):
    points=service.trajectory("19607101")
    assert len(points) == 703
    assert points[0]["profile_index"] == 0 and points[-1]["profile_index"] == 702
    assert points[0]["along_track_distance_km"] == 0
    assert points[-1]["along_track_distance_km"] > 0

def test_profile_uses_qc_one_per_variable(service):
    detail=service.profile_detail("19607101",351)
    assert detail["total_observation_count"] > 0
    assert all(any(row[v] is not None for v in ("temperature","salinity","chlorophyll_a")) for row in detail["levels"])
    assert detail["usable_observation_count"] == len(detail["levels"])

@pytest.mark.parametrize("variable",["temperature","salinity","chlorophyll_a"])
def test_observed_binned_curtain_preserves_nulls(service,variable):
    curtain=service.curtain("19607101",variable,20)
    assert len(curtain["profile_indices"]) == 703
    assert curtain["finite_cell_count"] > 0 and curtain["null_cell_count"] > 0
    assert "no horizontal interpolation" in curtain["aggregation_method"]

def test_invalid_profile_and_curtain_variable(service):
    with pytest.raises(IndexError): service.profile_detail("19607101",703)
    with pytest.raises(ValueError): service.curtain("19607101","u")
