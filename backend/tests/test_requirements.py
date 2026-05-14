from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import database
import users


class RequirementTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmpdir.name) / "test.sqlite3"
        database.initialize_database(self.db_path, force=True)

    def tearDown(self) -> None:
        self.tmpdir.cleanup()

    def test_offline_top_list_has_minimum_ten_people(self) -> None:
        persons = database.list_persons(database_path=self.db_path)
        self.assertGreaterEqual(len(persons), 10)

    def test_each_person_has_historical_source(self) -> None:
        persons = database.list_persons(database_path=self.db_path)
        self.assertTrue(all(person["sources"] for person in persons))

    def test_missing_coordinates_cannot_be_saved(self) -> None:
        payload = {
            "full_name": "Testowa osoba",
            "birth_year": 1900,
            "death_year": 1950,
            "description": "Pierwsze zdanie. Drugie zdanie. Trzecie zdanie.",
            "sources": ["https://example.org/source"],
            "grave": {"sector": "Sektor testowy"},
        }
        with self.assertRaises(ValueError):
            database.create_person_with_grave(payload, database_path=self.db_path)

    def test_distance_calculation_is_positive_and_reasonable(self) -> None:
        meters = database.distance_meters(54.66842, 25.30236, 54.66887, 25.30352)
        self.assertGreater(meters, 50)
        self.assertLess(meters, 150)

    def test_navigation_returns_direction_and_distance(self) -> None:
        nav = database.navigation_to_person(1, 54.66842, 25.30236, database_path=self.db_path)
        self.assertIn("direction", nav)
        self.assertIn("distance_meters", nav)
        self.assertGreater(nav["distance_meters"], 0)

    def test_error_messages_are_readable(self) -> None:
        self.assertIn("Brak GPS", database.ERROR_MESSAGES["gps_unavailable"])
        self.assertIn("Niska dokładność GPS", database.ERROR_MESSAGES["gps_low_accuracy"])
        self.assertIn("Brak internetu", database.ERROR_MESSAGES["offline"])

    def test_offline_bundle_contains_cards_graves_and_map_strategy(self) -> None:
        bundle = database.build_offline_bundle(database_path=self.db_path)
        self.assertGreaterEqual(len(bundle["persons"]), 10)
        self.assertGreaterEqual(len(bundle["graves"]), 10)
        self.assertEqual(bundle["map"]["provider"], "OpenStreetMap")

    def test_users_table_is_created_and_seeded(self) -> None:
        users.initialize_users(self.db_path)
        seeded_users = users.list_users(self.db_path)

        self.assertGreaterEqual(len(seeded_users), 2)
        self.assertTrue(any(user["email"] == "demo@na-rossie.local" for user in seeded_users))

    def test_user_can_register_and_login(self) -> None:
        created = users.create_user("Test User", "test@example.com", "secret123", self.db_path)
        logged_in = users.authenticate_user("test@example.com", "secret123", self.db_path)
        wrong_password = users.authenticate_user("test@example.com", "bad-password", self.db_path)

        self.assertEqual(created["email"], "test@example.com")
        self.assertIsNotNone(logged_in)
        self.assertIsNone(wrong_password)


if __name__ == "__main__":
    unittest.main()
