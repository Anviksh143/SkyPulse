import os

with open('templates/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '<div class="row g-4 mb-4">'
end_marker = '</div>\n      {% endif %}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx != -1 and end_idx != -1:
    panel_content = content[start_idx:end_idx]
    
    panel_content = panel_content.replace('weather.', 'w.')
    panel_content = panel_content.replace('weather ', 'w ')
    panel_content = panel_content.replace('col-lg-5 col-md-12', '{{ "col-12" if is_compare else "col-lg-5 col-md-12" }}')
    panel_content = panel_content.replace('col-lg-7 col-md-12', '{{ "col-12" if is_compare else "col-lg-7 col-md-12" }}')
    
    with open('templates/weather_panel.html', 'w', encoding='utf-8') as out:
        out.write(panel_content)
    print('Extracted to weather_panel.html')
else:
    print('Markers not found')
