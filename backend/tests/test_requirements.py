from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import database
import caretakers
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

    def test_caretaker_assignments_are_saved_and_replaced(self) -> None:
        caretakers.replace_caretaker_assignments(
            "opiekun@example.com",
            [1, 4, 10],
            "admin@example.com",
            self.db_path,
        )
        caretakers.replace_caretaker_assignments(
            "opiekun@example.com",
            [2, 4],
            "admin@example.com",
            self.db_path,
        )

        assignments = caretakers.list_caretaker_assignments(self.db_path)
        self.assertEqual(assignments["opiekun@example.com"], [2, 4])

    def test_caretaker_update_is_saved(self) -> None:
        created = caretakers.create_caretaker_update(
            caretaker_email="opiekun@example.com",
            caretaker_name="Opiekun Testowy",
            note="Sprawdzono stan dwoch grobow.",
            assigned_count=3,
            open_tasks_count=1,
            database_path=self.db_path,
        )
        updates = caretakers.list_caretaker_updates("opiekun@example.com", self.db_path)

        self.assertEqual(created["caretakerEmail"], "opiekun@example.com")
        self.assertEqual(len(updates), 1)
        self.assertEqual(updates[0]["openTasksCount"], 1)

    def test_user_care_report_can_be_saved_and_resolved(self) -> None:
        created = caretakers.create_care_report(
            place_id=4,
            place_name="Antoni Wiwulski",
            report_type="needs_care",
            note="Grob wymaga sprawdzenia po zimie.",
            reporter_email="visitor@example.com",
            database_path=self.db_path,
        )
        updated = caretakers.update_care_report_status(
            int(created["id"]),
            "resolved",
            self.db_path,
        )
        reports = caretakers.list_care_reports(database_path=self.db_path)

        self.assertEqual(created["status"], "new")
        self.assertIsNotNone(updated)
        self.assertEqual(updated["status"], "resolved")
        self.assertEqual(len(reports), 1)


if __name__ == "__main__":
    unittest.main()
