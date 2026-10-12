import json
from pathlib import Path
import tempfile
import unittest

from amp_claude_history import import_records, sanitize


class AmpHistoryTests(unittest.TestCase):
    def record(self, output=10):
        return {"timestamp": "2026-10-12T01:00:00Z", "requestId": "r1",
                "message": {"id": "m1", "model": "claude-opus-5-5",
                            "content": "PRIVATE CONVERSATION",
                            "usage": {"input_tokens": 2, "output_tokens": output,
                                      "cache_read_input_tokens": 100, "unknown": "SECRET"}},
                "credentials": "SECRET", "cwd": "/private/project"}

    def test_export_strips_conversation_and_unknown_fields(self):
        result = json.dumps(sanitize(self.record()))
        for private in ("PRIVATE", "SECRET", "/private", "content", "credentials"):
            self.assertNotIn(private, result)
        self.assertIn("cache_read_input_tokens", result)

    def test_invalid_usage_is_not_zero(self):
        with self.assertRaises(ValueError):
            sanitize(self.record(-1))
        with self.assertRaises(ValueError):
            sanitize(self.record("10"))

    def test_repeat_import_is_idempotent_and_retains_larger_streaming_records(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            source = home / "export.jsonl"
            source.write_text(json.dumps(self.record()) + "\n")
            args = (source, "T-00000000-0000-0000-0000-000000000001", home,
                    "00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003")
            path, count = import_records(*args)
            self.assertEqual(count, 1)
            self.assertEqual(import_records(*args)[1], 1)
            source.write_text(json.dumps(self.record(20)) + "\n")
            self.assertEqual(import_records(*args)[1], 2)
            self.assertEqual(json.loads(path.read_text().splitlines()[0])["ownerAccountUuid"], args[3])
            with self.assertRaises(ValueError):
                import_records(*args[:3], "00000000-0000-0000-0000-000000000004", args[4])
            before = path.read_bytes()
            source.write_text("{}\n")
            with self.assertRaises(ValueError):
                import_records(*args)
            self.assertEqual(path.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
