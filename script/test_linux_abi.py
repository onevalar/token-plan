import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('abi',Path(__file__).parent/'ci/check_linux_abi.py')
abi=importlib.util.module_from_spec(spec)
spec.loader.exec_module(abi)

class LinuxABI(unittest.TestCase):
    def test_new_glibc_requirement_is_rejected_by_baseline(self):
        required=abi.versions('Name: GLIBC_2.35 Flags: none\nName: GLIBC_2.39 Flags: none\nName: GLIBCXX_3.4.30')
        self.assertEqual(required,[(2,35),(2,39)])
        self.assertGreater(max(required),abi.BASELINE)

    def test_older_versions_and_absent_requirements(self):
        self.assertLessEqual(max(abi.versions('Name: GLIBC_2.2.5 Name: GLIBC_2.34')),abi.BASELINE)
        self.assertEqual(abi.versions('No version information found'),[])

if __name__=='__main__':unittest.main()
