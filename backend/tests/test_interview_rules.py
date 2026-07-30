import unittest

from app.rules import INDUSTRIES, all_profiles, get_rule_catalog, resolve_profile


class InterviewRuleCatalogTests(unittest.TestCase):
    def test_catalog_has_complete_industry_level_matrix(self):
        profiles = all_profiles()
        self.assertEqual(len(INDUSTRIES), 15)
        self.assertEqual(len(profiles), 60)
        self.assertEqual(
            len({profile.rule_id for profile in profiles}),
            60,
        )
        self.assertTrue(all(len(industry.levels) == 4 for industry in INDUSTRIES))

    def test_every_profile_resolves_to_existing_mandatory_bundle(self):
        catalog = get_rule_catalog()
        for profile in all_profiles():
            with self.subTest(
                industry=profile.industry.name,
                level=profile.level,
            ):
                bundle = catalog.bundle_for(
                    profile.industry.name,
                    profile.level,
                )
                self.assertEqual(bundle.profile.rule_id, profile.rule_id)
                self.assertEqual(len(bundle.documents), 8)
                self.assertIn(profile.rule_id, bundle.rule_ids)
                self.assertGreaterEqual(len(bundle.source_ids), 3)
                self.assertIn("tối thiểu **5 câu**", bundle.documents[-1].content)
                tier_rule = next(
                    document
                    for document in bundle.documents
                    if document.kind == "level"
                )
                self.assertEqual(tier_rule.level, "*")
                self.assertEqual(tier_rule.tier, profile.tier.index)

    def test_validator_reports_expected_corpus_counts(self):
        result = get_rule_catalog().validate()
        self.assertEqual(result["industries"], 15)
        self.assertEqual(result["tiers"], 4)
        self.assertEqual(result["profiles"], 60)
        self.assertGreaterEqual(result["documents"], 84)
        self.assertGreaterEqual(result["sources"], 10)

    def test_unknown_values_use_documented_general_middle_fallback(self):
        profile = resolve_profile("ngành không tồn tại", "level lạ")
        self.assertEqual(profile.industry.name, "Khác")
        self.assertEqual(profile.level, "Middle")
        self.assertEqual(profile.tier.index, 2)


if __name__ == "__main__":
    unittest.main()
