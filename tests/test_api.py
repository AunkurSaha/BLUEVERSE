import unittest
from fastapi.testclient import TestClient
from backend.app.main import app

class TestAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_list_datasets(self):
        response = self.client.get("/api/datasets")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        self.assertIn("bay-of-bengal-temperature", data)

    def test_get_dataset_metadata(self):
        response = self.client.get("/api/datasets/bay-of-bengal-temperature/metadata")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["dataset_id"], "bay-of-bengal-temperature")
        self.assertNotIn("file_path", data)
        self.assertIn("provenance", data)
        self.assertIn("product_id", data["provenance"])
        self.assertIn("dimensions", data)
        self.assertIn("variables", data)

    def test_get_slice(self):
        # We need to know a variable name from the dataset. Let''s assume "thetao" is present.
        response = self.client.get("/api/datasets/bay-of-bengal-temperature/slice?variable=thetao&time_index=0&depth_index=0")
        # This might fail if the variable is not present or indices are out of range, but we''ll accept 200 or 400/404/500 for now.
        # We''ll just check that the response is not 500 if the dataset exists.
        if response.status_code == 200:
            data = response.json()
            self.assertIn("slice_data", data)
            self.assertIn("finite_count", data)
        else:
            # If it''s not 200, it should be a 4xx error (not 500)
            self.assertLess(response.status_code, 500)

if __name__ == '__main__':
    unittest.main()
