import json
from pathlib import Path

G = json.loads(Path("graphify-out/graph.json").read_text(encoding="utf-8"))

node_ids = {n["id"] for n in G["nodes"]}
connected = set()

for e in G["links"]:
    s = e.get("source", "")
    t = e.get("target", "")
    if isinstance(s, dict):
        s = s.get("id", "")
    if isinstance(t, dict):
        t = t.get("id", "")
    connected.add(s)
    connected.add(t)

isolated = [n for n in G["nodes"] if n["id"] not in connected]
print(
    f"Total nodes: {len(G['nodes'])}, Connected: {len(connected)}, Isolated: {len(isolated)}"
)

# Show distribution by file type
from collections import Counter

type_counter = Counter()
for n in isolated:
    ft = n.get("file_type", "unknown")
    type_counter[ft] += 1
print("Isolated nodes by type:")
for t, c in type_counter.most_common():
    print(f"  {t}: {c}")

# Show sample
print("\nSample isolated nodes:")
for n in isolated[:25]:
    print(f"  {n['id']} - {n.get('label', '?')} ({n.get('file_type', '?')})")
