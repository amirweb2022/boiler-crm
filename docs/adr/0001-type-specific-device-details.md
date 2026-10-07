# Store type-specific device details as JSON

Inspection devices share the same cycle and status lifecycle, but their descriptive fields differ. Keep the established `name` and `volume` columns for tanks and boilers, and store the new categories' attributes in one JSON details field on both current devices and immutable history snapshots. This avoids adding columns for every equipment type while keeping existing records and certificate flows compatible.
