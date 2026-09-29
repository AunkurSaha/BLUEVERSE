import pytest
from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_event_list_detail_and_track_endpoints():
    list_response = client.get("/api/events")
    assert list_response.status_code == 200
    assert [event["id"] for event in list_response.json()] == ["cyclone-amphan-2020"]

    detail_response = client.get("/api/events/cyclone-amphan-2020")
    assert detail_response.status_code == 200
    assert detail_response.json()["source_event_id"] == "2020136N10088"
    assert detail_response.json()["track_point_count"] == 45
    assert detail_response.json()["historical_ocean_data"] == {
        "status": "AVAILABLE",
        "variables": ["Temperature", "Salinity", "Currents"],
        "dataset_ids": [
            "amphan-2020-temperature",
            "amphan-2020-salinity",
            "amphan-2020-uo",
            "amphan-2020-vo",
        ],
    }

    track_response = client.get("/api/events/cyclone-amphan-2020/track")
    assert track_response.status_code == 200
    track = track_response.json()
    assert track["point_count"] == len(track["points"]) == 45
    assert track["units"] == {
        "latitude": "degrees_north",
        "longitude": "degrees_east",
        "wind": "kts",
        "pressure": "mb",
    }


def test_unknown_event_endpoints_return_404():
    assert client.get("/api/events/not-registered").status_code == 404
    assert client.get("/api/events/not-registered/track").status_code == 404


def test_real_historical_ocean_analysis_endpoints_preserve_context_and_units():
    configuration = client.get("/api/events/cyclone-amphan-2020/ocean/config")
    assert configuration.status_code == 200
    config = configuration.json()
    event_detail = client.get("/api/events/cyclone-amphan-2020").json()
    assert event_detail["source"] == "NOAA IBTrACS v04r01"
    assert config["provider"] == "Mercator Ocean International"
    assert config["provider"] not in event_detail["source"]
    assert config["dataset_ids"] == {
        "thetao": "amphan-2020-temperature",
        "so": "amphan-2020-salinity",
        "uo": "amphan-2020-uo",
        "vo": "amphan-2020-vo",
    }
    assert [window["sample_count"] for window in config["analysis_windows"]] == [3, 6, 3]

    phase = client.get(
        "/api/events/cyclone-amphan-2020/ocean/phase-mean",
        params={"variable": "thetao", "phase": "before", "depth_index": 0},
    )
    assert phase.status_code == 200
    phase_data = phase.json()
    assert phase_data["slice"]["var_units"] == "degrees_C"
    assert phase_data["slice"]["actual_depth"] == pytest.approx(0.49402499198913574)
    assert phase_data["sample_count"] == 3

    currents = client.get(
        "/api/events/cyclone-amphan-2020/ocean/phase-mean",
        params={"variable": "currents", "phase": "during", "depth_index": 15},
    )
    assert currents.status_code == 200
    current_data = currents.json()
    assert current_data["joint_finite_pairing"] is True
    assert current_data["uo"]["var_name"] == "uo"
    assert current_data["vo"]["var_name"] == "vo"

    difference = client.get(
        "/api/events/cyclone-amphan-2020/ocean/difference",
        params={"variable": "so", "comparison": "after-before", "depth_index": 30},
    )
    assert difference.status_code == 200
    difference_data = difference.json()
    assert difference_data["slice"]["var_units"] == "1e-3 difference"
    assert difference_data["color_scale"]["min"] == -difference_data["color_scale"]["max"]

    probe = client.get(
        "/api/events/cyclone-amphan-2020/ocean/probe",
        params={
            "requested_event_time": "2020-05-20T09:00:00Z",
            "latitude": 18.0,
            "longitude": 87.0,
        },
    )
    assert probe.status_code == 200
    probe_data = probe.json()
    assert probe_data["matched_model_time"].startswith("2020-05-20T00:00:00")
    assert probe_data["absolute_offset_hours"] == 9.0
    assert len(probe_data["temperature"]["levels"]) == 31
    assert len(probe_data["salinity"]["levels"]) == 31
    assert len(probe_data["currents"]["levels"]) == 31
    assert probe_data["value_classification"] == "model_reanalysis"
