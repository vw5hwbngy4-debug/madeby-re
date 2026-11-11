PHANTASY STAR ONLINE — COMPLETE USER-SUPPLIED SCRIPT JSON

Built from: Pso_script_files.txt
Source bytes: 527263
Physical lines: 15336
SHA-256: 27ffff25632c328a9e821a066e7a31f6257b94383585342f85eef847edab20e7

IMPORTANT
- This package treats the supplied TXT as canonical.
- The master JSON contains the complete raw source text and every physical line.
- No dialogue, action line, branch note, quest-board text, typo, placeholder, or pasted inline block is intentionally discarded.
- HTML entities / Markdown are only decoded in parallel `plain` fields. Raw fields remain source-faithful.
- The source has inconsistent formatting: several quest titles are glued to the previous sentence on the same physical line. Those are flagged with `title_embedded_in_mixed_source_line`.
- `speaker_or_script_label_candidates` is an index, not a claim that every candidate is definitely a character.

FILES
- pso_full_script_canon.json: master lossless corpus + structured quest/event/shop records + indexes.
- pso_quest_index.json: compact quest/event/shop index.
- pso_full_quest_records.json: all 56 quest/event/shop records with full raw text.
- pso_content_blocks.json: all non-empty source blocks with line ranges.
- pso_speaker_label_index.json: searchable speaker/script-label candidate index.
- pso_area_heading_index.json: explicit area/section heading index.
- pso_full_script_raw.txt: exact source copy.
- validation_report.json: integrity/count report.

VALIDATION
- Exact source reconstruction: True
- Metadata quest headers detected: 52
- Quest/event/shop records built: 56
- Known source quest/event/shop titles indexed: 56/56
