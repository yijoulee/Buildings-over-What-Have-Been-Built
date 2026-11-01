---
slug: musee-dorsay
title: Musée d'Orsay
architect: A.C.T. Architecture          # "Unknown" is a permitted value
area_m2: 8250
year_completed: "1986"             # display string — some cases read "7th Century"
year_sort: 1986                    # integer used by the Sort control; approximate if needed
city: Paris                        # occasionally a country, e.g. the Great Wall
country: France
coordinates: [48.8600, 2.3266]
location_note:                     # optional — use when the point is approximate

# header matrix — all controlled vocabularies, all filterable
original_function: Train Station
original_form_geometry: Rectangular
original_form_organisation: Linear
new_function: Museum
new_form_geometry: Rectangular
new_form_organisation: Linear
strategy: [Function Follows Form]      # multi-select

sections:
  introduction:
    body: |
      Markdown. Paragraphs and bullet lists.
    images:
      - src: perspective-section.jpg
        caption: Perspective Section of Musée d'Orsay
  reuse_goal:
    body: |
      ...
    images:
      - src: gare-dorsay.jpg
        caption: Gare d'Orsay
  challenges:
    body: |
      ...
    images: [...]
  adaptive_strategy:
    body: |
      ...
    images: [...]
  solutions:
    body: |
      ...
    figure: comparison    # "separate" (default) | "comparison"
    images:
      - src: under-construction.jpg
        caption: Under Repurposing Construction
        label: Before
      - src: after-construction.jpg
        caption: After Repurposing Construction
        label: After
---