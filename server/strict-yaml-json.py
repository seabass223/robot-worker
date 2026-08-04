#!/usr/bin/env python
"""Load a single YAML document as JSON while rejecting duplicate mapping keys."""
import json
import sys
import yaml


class UniqueKeyLoader(yaml.SafeLoader):
    pass


def construct_unique_mapping(loader, node, deep=False):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise yaml.constructor.ConstructorError(
                "while constructing a mapping", node.start_mark,
                f"duplicate key: {key!r}", key_node.start_mark,
            )
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


UniqueKeyLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG,
    construct_unique_mapping,
)

if len(sys.argv) != 2:
    raise SystemExit("usage: strict-yaml-json.py CONFIG")
with open(sys.argv[1], "r", encoding="utf-8") as handle:
    documents = list(yaml.load_all(handle, Loader=UniqueKeyLoader))
if len(documents) != 1 or not isinstance(documents[0], dict):
    raise SystemExit("configuration must contain exactly one mapping document")
print(json.dumps(documents[0], separators=(",", ":")))
