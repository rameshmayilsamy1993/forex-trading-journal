import json
from pathlib import Path

G = json.loads(Path("graphify-out/graph.json").read_text(encoding="utf-8"))

print("schemaOptions is imported by these model files:")
for n in G["nodes"]:
    nid = n.get("id", "")
    if (
        "schemaoptions" in nid.lower()
        and nid != "backend_src_config_schemaoptions_schemaoptions"
    ):
        print(f"  {nid}")

print("\n\nEdges from schemaOptions definition:")
for e in G["links"]:
    src = e.get("source", "")
    tgt = e.get("target", "")
    rel = e.get("relation", "?")
    if "schemaoptions" in src.lower() or "schemaoptions" in tgt.lower():
        print(f"  {src} --{rel}--> {tgt}")

print("\n\nEdges from mongoose:")
for e in G["links"]:
    src = e.get("source", "")
    tgt = e.get("target", "")
    if "mongoose" in src.lower() or "mongoose" in tgt.lower():
        print(f"  {src} --{e.get('relation', '?')}--> {tgt}")
