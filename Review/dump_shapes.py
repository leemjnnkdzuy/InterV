# -*- coding: utf-8 -*-
import json

with open(r'd:\project\InterV\Review\all_slides_shapes_inspect.json', 'r', encoding='utf-8') as f:
    slides = json.load(f)

lines = []
for s in slides:
    lines.append(f"=== Slide {s['slide_num']} ({s['layout']}) ===")
    for sh in s['shapes']:
        lines.append(f"   {sh['name']} | L={sh['left']} T={sh['top']} W={sh['width']} H={sh['height']} offset={sh['center_offset']} | {sh['text']}")

with open(r'd:\project\InterV\Review\all_shapes_dump.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print('Saved all_shapes_dump.txt')
