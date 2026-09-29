from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_region_list_and_detail_endpoints():
    list_response = client.get("/api/regions")
    assert list_response.status_code == 200
    regions = list_response.json()
    assert [region["id"] for region in regions] == [
        "bay-of-bengal",
        "arabian-sea",
        "equatorial-indian-ocean",
        "andaman-sea",
        "northern-indian-ocean",
    ]

    bay_response = client.get("/api/regions/bay-of-bengal")
    assert bay_response.status_code == 200
    assert bay_response.json()["data_status"] == "DATA_BACKED"

    arabian_response = client.get("/api/regions/arabian-sea")
    assert arabian_response.status_code == 200
    arabian = arabian_response.json()
    assert arabian["data_status"] == "DATA_BACKED"
    assert arabian["supported_variables"] == ["Temperature", "Salinity", "Currents"]
    assert arabian["observation_sources"] == []
    assert arabian["analysis_capabilities"] == [
        "Ocean Probe",
        "Depth exploration",
        "Time playback",
        "Temperature 3D",
        "Temperature Isosurface",
        "Temperature Transect",
    ]
    assert [dataset["id"] for dataset in arabian["model_datasets"]] == [
        "arabian-sea-temperature",
        "arabian-sea-salinity",
        "arabian-sea-uo",
        "arabian-sea-vo",
    ]
    assert arabian["model_datasets"][0]["bounds"] == {
        "west": 50.0,
        "south": 5.0,
        "east": 78.0,
        "north": 25.0,
    }

    missing_response = client.get("/api/regions/not-registered")
    assert missing_response.status_code == 404
