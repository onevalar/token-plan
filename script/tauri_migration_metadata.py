"""Sparkle validates the destination app as well as the downloaded archive."""
def validate_migration_key(info, config):
    expected = config.get('sparkle_public_key')
    if not expected or info.get('SUPublicEDKey') != expected:
        raise ValueError('Native Sparkle migration requires the original SUPublicEDKey in the destination app')
