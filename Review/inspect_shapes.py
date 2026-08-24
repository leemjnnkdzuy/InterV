import json

with open(r'd:\project\InterV\Review\slide_shapes_detail.json', 'r', encoding='utf-8') as f:
    slides = json.load(f)

with open(r'd:\project\InterV\Review\key_slides_shapes.txt', 'w', encoding='utf-8') as out:
    for s in slides:
        num = s['slide_num']
        if num in [9, 12, 13, 14, 15, 16, 17, 23, 24, 25, 26, 27]:
            out.write(f"=== SLIDE {num} ===\n")
            for sh in s['shapes']:
                if sh['has_text']:
                    texts = [p['text'] for p in sh['paragraphs'] if p['text'].strip()]
                    if texts:
                        out.write(f"  Shape {sh['shape_idx']} ({sh['shape_name']}): {texts}\n")
            out.write("\n")
print("Wrote key_slides_shapes.txt successfully")
