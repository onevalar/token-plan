import plistlib
import unittest

from repair_menu_bar_association import repaired_tracking


def loc(name):
    return {"bundle": {"_0": name}}


class RepairAssociationTests(unittest.TestCase):
    def setUp(self):
        self.owner = "com.openai.codex"
        self.target = "com.onevalar.tokenplan.dev"
        # Tahoe stores a flat sequence of location keys and record values.
        self.records = [loc(self.owner), {
            "location": loc(self.owner), "isAllowed": False,
            "menuItemLocations": [loc(self.owner), loc(self.target), loc("unrelated")],
            "futureField": {"preserve": True},
        }, loc(self.target), {
            "location": loc(self.target), "isAllowed": True,
            "menuItemLocations": [loc(self.target)],
        }]

    def patch(self, records):
        return repaired_tracking(plistlib.dumps(records, fmt=plistlib.FMT_BINARY), self.owner, self.target)

    def test_only_foreign_reference_changes_and_switches_are_preserved(self):
        payload, count = self.patch(self.records)
        expected = plistlib.loads(plistlib.dumps(self.records))
        expected[1]["menuItemLocations"] = [loc(self.owner), loc("unrelated")]
        self.assertEqual(count, 1)
        self.assertEqual(plistlib.loads(payload), expected)
        self.assertEqual(len(self.records[1]["menuItemLocations"]), 3)

    def test_second_run_is_byte_identical_noop(self):
        payload, _ = self.patch(self.records)
        second, count = repaired_tracking(payload, self.owner, self.target)
        self.assertEqual((second, count), (payload, 0))

    def test_similarly_named_and_other_owners_are_untouched(self):
        self.records[1]["menuItemLocations"].append(loc(self.target + ".review"))
        self.records += [loc("another"), {"location": loc("another"), "isAllowed": False,
                         "menuItemLocations": [loc(self.target)]}]
        payload, count = self.patch(self.records)
        result = plistlib.loads(payload)
        self.assertEqual(count, 1)
        self.assertEqual(result[-1], self.records[-1])
        self.assertIn(loc(self.target + ".review"), result[1]["menuItemLocations"])

    def test_disabled_or_missing_target_is_rejected(self):
        self.records[3]["isAllowed"] = False
        with self.assertRaises(ValueError):
            self.patch(self.records)
        with self.assertRaises(ValueError):
            self.patch(self.records[:2])

    def test_unknown_structure_is_rejected(self):
        with self.assertRaises(ValueError):
            self.patch({"unexpected": self.records})
        self.records[1]["menuItemLocations"] = "unexpected"
        with self.assertRaises(ValueError):
            self.patch(self.records)


if __name__ == "__main__":
    unittest.main()
