-- Seed initial categories for landscape photos

INSERT INTO categories (name, description, color) VALUES
('montañas', 'Paisajes montañosos, picos, cordilleras', '#8B4513'),
('río', 'Ríos, arroyos, corrientes de agua', '#4682B4'),
('lago', 'Lagos, lagunas, espejos de agua', '#1E90FF'),
('bosque', 'Bosques, selvas, áreas forestales', '#228B22'),
('océano', 'Océanos, mares, costas marítimas', '#006994'),
('pradera', 'Praderas, campos, pastizales', '#9ACD32'),
('cielo', 'Cielos, nubes, atmósfera', '#87CEEB'),
('nieve', 'Paisajes nevados, hielo, glaciares', '#F0F8FF'),
('flores', 'Flores silvestres, jardines florales', '#FF69B4'),
('rocas', 'Formaciones rocosas, acantilados', '#696969'),
('árboles', 'Árboles individuales o grupos', '#8FBC8F'),
('agua', 'Elementos acuáticos generales', '#40E0D0'),
('vegetación', 'Vegetación diversa, plantas', '#90EE90'),
('atardecer', 'Atardeceres, puestas de sol', '#FF8C00'),
('amanecer', 'Amaneceres, salidas del sol', '#FFD700'),
('nubes', 'Formaciones nubosas', '#F5F5F5'),
('costa', 'Líneas costeras, playas', '#F4A460'),
('valle', 'Valles, depresiones naturales', '#DEB887'),
('cascada', 'Cascadas, saltos de agua', '#B0E0E6'),
('desierto', 'Paisajes desérticos, dunas', '#F5DEB3')
ON CONFLICT (name) DO NOTHING;
