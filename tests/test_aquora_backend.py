from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get('/health')
    assert response.status_code == 200
    payload = response.json()
    assert payload['status'] == 'ok'


def test_region_endpoint_returns_six_regions():
    response = client.get('/api/v1/regions')
    assert response.status_code == 200
    payload = response.json()
    assert len(payload['regions']) == 6
    assert payload['regions'][0]['id']


def test_telemetry_endpoint_returns_metrics_for_region():
    response = client.get('/api/v1/telemetry', params={'region': 'bay_of_bengal', 'depth': 200, 'month': 4})
    assert response.status_code == 200
    payload = response.json()
    assert payload['region_id'] == 'bay_of_bengal'
    assert 'temperature' in payload['metrics']
    assert 'salinity' in payload['metrics']


def test_forecast_endpoint_returns_seven_day_arrays():
    response = client.get('/api/v1/forecast', params={'region': 'bay_of_bengal'})
    assert response.status_code == 200
    payload = response.json()
    assert len(payload['temperature']) == 7
    assert len(payload['salinity']) == 7
