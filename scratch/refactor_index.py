import re

def update_index_html():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    # 1. Update collection cards
    # Diğer -> Plak
    html = html.replace('<h3>Diğer Koleksiyonlar</h3>', '<h3>Plak Arşivi</h3>')
    html = html.replace('<p>Farklı kategorilerdeki koleksiyon parçaları. Sürekli genişleyen arşiv ile yeni gruplar ekleniyor.</p>', '<p>Nadir ve koleksiyonluk plaklar. Her biri özenle belgelenmiş dijital arşiv.</p>')
    html = html.replace('aria-label="Diğer koleksiyonları görüntüle"', 'aria-label="Plak Arşivini görüntüle"')
    html = html.replace('🗂️', '💿')
    
    # Update data-scroll-to for Matchbox and Plak
    html = html.replace('aria-label="Matchbox Koleksiyonunu görüntüle"', 'data-scroll-to="matchbox"\n           aria-label="Matchbox Koleksiyonunu görüntüle"')
    html = html.replace('aria-label="Plak Arşivini görüntüle"', 'data-scroll-to="plak"\n           aria-label="Plak Arşivini görüntüle"')
    
    # Add count elements for them
    html = html.replace('<span class="count-num">—</span>', '<span class="count-num matchbox-count-num">—</span>', 1)
    html = html.replace('<span class="count-num">—</span>', '<span class="count-num plak-count-num">—</span>', 1)
    
    # Update pul count num class
    html = html.replace('<span class="count-num">2000+</span>', '<span class="count-num pul-count-num">2000+</span>')

    # 2. Duplicate gallery section
    match = re.search(r'<!-- ════════════════════════════════════════\s*GALLERY — PDF ARCHIVE\s*════════════════════════════════════════ -->\s*(<section class="section gallery-section" id="galeri".*?</section>)', html, re.DOTALL)
    if not match:
        print("Could not find gallery section")
        return
        
    gallery_section = match.group(1)
    
    # Create Matchbox section
    matchbox_section = gallery_section.replace('id="galeri"', 'id="matchbox"')
    matchbox_section = matchbox_section.replace('aria-labelledby="gallery-heading"', 'aria-labelledby="matchbox-heading"')
    matchbox_section = matchbox_section.replace('Pul Arşivi', 'Matchbox Koleksiyonu')
    matchbox_section = matchbox_section.replace('id="gallery-heading">Koleksiyon Dosyaları', 'id="matchbox-heading">Matchbox Dosyaları')
    matchbox_section = matchbox_section.replace('Koleksiyona ait tüm parçalar dijital ortamda özenle belgelenmiştir.', 'Klasik ve koleksiyonluk Matchbox minyatür araç modelleri dijital ortamda belgelenmiştir.')
    matchbox_section = matchbox_section.replace('id="apiNotice"', 'id="apiNotice_matchbox"')
    matchbox_section = matchbox_section.replace('id="searchBox"', 'id="searchBox_matchbox"')
    matchbox_section = matchbox_section.replace('placeholder="Pul ara… (ülke, tema, yıl)"', 'placeholder="Matchbox ara…"')
    matchbox_section = matchbox_section.replace('id="filterRow"', 'id="filterRow_matchbox"')
    matchbox_section = matchbox_section.replace('id="galleryMeta"', 'id="galleryMeta_matchbox"')
    matchbox_section = matchbox_section.replace('id="pdfGrid"', 'id="pdfGrid_matchbox"')
    matchbox_section = matchbox_section.replace('id="galleryLoading"', 'id="galleryLoading_matchbox"')
    matchbox_section = matchbox_section.replace('id="galleryEmpty"', 'id="galleryEmpty_matchbox"')
    matchbox_section = matchbox_section.replace('id="paginationContainer"', 'id="paginationContainer_matchbox"')
    matchbox_section = matchbox_section.replace('Pul ara…', 'Matchbox ara…')
    matchbox_section = matchbox_section.replace('eşleşen pul bulunamadı', 'eşleşen Matchbox bulunamadı')
    
    # Create Plak section
    plak_section = gallery_section.replace('id="galeri"', 'id="plak"')
    plak_section = plak_section.replace('aria-labelledby="gallery-heading"', 'aria-labelledby="plak-heading"')
    plak_section = plak_section.replace('<span class="eyebrow">Pul Arşivi</span>', '<span class="eyebrow">Plak Arşivi</span>')
    plak_section = plak_section.replace('id="gallery-heading">Koleksiyon Dosyaları', 'id="plak-heading">Plak Dosyaları')
    plak_section = plak_section.replace('Koleksiyona ait tüm parçalar dijital ortamda özenle belgelenmiştir. İlgili dosyaya tıklayarak önizleyebilir veya detayları görüntüleyebilirsiniz.', 'Nadir ve koleksiyonluk plaklar dijital ortamda özenle belgelenmiştir. İlgili dosyaya tıklayarak önizleyebilir veya detayları görüntüleyebilirsiniz.')
    plak_section = plak_section.replace('id="apiNotice"', 'id="apiNotice_plak"')
    plak_section = plak_section.replace('id="searchBox"', 'id="searchBox_plak"')
    plak_section = plak_section.replace('placeholder="Pul ara… (ülke, tema, yıl)"', 'placeholder="Plak ara…"')
    plak_section = plak_section.replace('id="filterRow"', 'id="filterRow_plak"')
    plak_section = plak_section.replace('id="galleryMeta"', 'id="galleryMeta_plak"')
    plak_section = plak_section.replace('id="pdfGrid"', 'id="pdfGrid_plak"')
    plak_section = plak_section.replace('id="galleryLoading"', 'id="galleryLoading_plak"')
    plak_section = plak_section.replace('id="galleryEmpty"', 'id="galleryEmpty_plak"')
    plak_section = plak_section.replace('id="paginationContainer"', 'id="paginationContainer_plak"')
    plak_section = plak_section.replace('Pul ara…', 'Plak ara…')
    plak_section = plak_section.replace('eşleşen pul bulunamadı', 'eşleşen plak bulunamadı')
    
    # Replace original gallery section with all three
    new_galleries = gallery_section + '\n\n' + matchbox_section + '\n\n' + plak_section
    html = html.replace(gallery_section, new_galleries)
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)

if __name__ == "__main__":
    update_index_html()
    print("index.html updated")
