from fpdf import FPDF
import os

class ProposalPDF(FPDF):
    def __init__(self):
        super().__init__(orientation='P', unit='mm', format='A4')
        self.emerald = (16, 185, 129)
        self.bg = (35, 39, 43)
        self.surface = (45, 50, 55)
        self.border = (60, 65, 70)
        self.text_main = (248, 250, 252)
        self.text_muted = (148, 163, 184)
        
    def header(self):
        # Fundo sólido cinza
        self.set_fill_color(*self.bg)
        self.rect(0, 0, 210, 297, 'F')

    def add_profile_header(self, photo_path):
        y_start = 20
        x_center_offset = 55
        
        # Borda esmeralda
        self.set_draw_color(*self.emerald)
        self.set_line_width(0.8)
        self.rect(x_center_offset, y_start, 25, 25, 'D')
        
        if os.path.exists(photo_path):
            self.image(photo_path, x_center_offset + 1, y_start + 1, 23)
        
        # Nome e Subtítulo
        self.set_xy(x_center_offset + 30, y_start + 5)
        self.set_font('Helvetica', 'B', 22)
        self.set_text_color(*self.emerald)
        self.cell(0, 10, 'BRENNO DANGONI', ln=1)
        
        self.set_x(x_center_offset + 30)
        self.set_font('Helvetica', '', 9)
        self.set_text_color(*self.text_muted)
        self.cell(0, 5, 'DEV & DESIGNER', ln=1)

    def hero_section(self):
        self.ln(12)
        self.set_font('Helvetica', 'B', 28)
        self.set_text_color(*self.text_main)
        self.multi_cell(0, 10, 'Orçamento:\nWebsites & Páginas de Venda.', align='C')
        
        self.ln(4)
        self.set_font('Helvetica', '', 11)
        self.set_text_color(*self.text_muted)
        self.multi_cell(0, 6, 'Design de alto padrão e tecnologia para conversão real.', align='C')

    def section_title(self, title):
        self.ln(8)
        self.set_text_color(*self.emerald)
        self.set_font('Helvetica', 'B', 9)
        self.cell(0, 8, title.upper(), ln=1, align='C')

    def add_project(self, img_path, title, desc, url, y):
        x_left = 20
        x_right = 100
        
        # Imagem do Projeto
        if os.path.exists(img_path):
            self.image(img_path, x_left, y, 70, 40)
            self.set_draw_color(*self.border)
            self.rect(x_left, y, 70, 40, 'D')

        # Detalhes
        self.set_xy(x_right, y + 2)
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(*self.text_main)
        self.cell(0, 8, title, ln=1)
        
        self.set_x(x_right)
        self.set_font('Helvetica', '', 9)
        self.set_text_color(*self.text_muted)
        self.multi_cell(90, 4.5, desc)
        
        self.set_x(x_right)
        self.set_font('Helvetica', 'B', 8)
        self.set_text_color(*self.emerald)
        self.cell(0, 8, url, ln=1)

    def add_price_card(self, badge, title, features, price, terms, y):
        x = 20
        w = 170
        h = 32
        
        # Card Background
        self.set_fill_color(*self.surface)
        self.set_draw_color(*self.border)
        self.set_line_width(0.2)
        self.rect(x, y, w, h, 'FD')
        
        # Badge
        self.set_xy(x + 10, y + 5)
        self.set_fill_color(*self.emerald)
        self.set_text_color(255, 255, 255)
        self.set_font('Helvetica', 'B', 7)
        self.cell(25, 4.5, badge.upper(), ln=0, align='C', fill=True)
        
        # Title
        self.set_xy(x + 10, y + 13)
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(*self.text_main)
        self.cell(0, 8, title, ln=0)
        
        # Features (Grid 2 colunas) - Substituído ponto por hífen
        self.set_font('Helvetica', '', 8)
        self.set_text_color(*self.text_muted)
        feat_x = x + 55
        feat_y = y + 7
        for i, f in enumerate(features):
            col = i % 2
            row = i // 2
            self.set_xy(feat_x + (col * 45), feat_y + (row * 6))
            self.cell(40, 5, f'- {f}')

        # Price & Terms
        self.set_xy(x + 130, y + 7)
        self.set_font('Helvetica', 'B', 18)
        self.set_text_color(*self.text_main)
        self.cell(30, 8, f'R$ {price}', ln=1, align='R')
        
        self.set_xy(x + 130, y + 16)
        self.set_font('Helvetica', 'B', 8)
        self.set_text_color(*self.emerald)
        self.cell(30, 4, f'R$ {int(price*0.9)} À VISTA', ln=1, align='R')
        
        self.set_xy(x + 130, y + 22)
        self.set_font('Helvetica', '', 7)
        self.set_text_color(*self.text_muted)
        self.cell(30, 4, terms, ln=1, align='R')

# --- EXECUÇÃO ---
pdf = ProposalPDF()
pdf.add_page()

# Header
pdf.add_profile_header('brenno.png')
pdf.hero_section()

# Projetos (Compactos)
pdf.section_title('Meus últimos projetos')
curr_y = 85
pdf.add_project('river.png', 'River Lab', 'Interface futurista para agência de vídeos AI de luxo.', 'www.riverdevelops.com', curr_y)
pdf.add_project('dogclub.png', 'DogClub Udi', 'Experience design para o maior DayCare de Uberlândia.', 'www.dogclub.com.br', curr_y + 45)

# Investimento (Tudo na mesma página para o "vibe" ser total)
pdf.section_title('Investimento')
price_y = 185
pdf.add_price_card('Essencial', 'Vendas Simples', ['Design Pro', '5 Alt. Inclusas', 'WhatsApp', 'Hospedagem'], 500, '50% sinal | 50% entrega', price_y)
pdf.add_price_card('Mais Pedido', 'Vendas Elite', ['Animações Pro', '10 Alt. Inclusas', 'Funil Luxo', 'Hospedagem'], 700, '50% sinal | 50% entrega', price_y + 36)
pdf.add_price_card('Completo', 'Pacote Premium', ['15 Páginas', '20 Alt. Inclusas', 'Suporte VIP', 'Tudo do Elite'], 900, '50% sinal | 50% entrega', price_y + 72)

# Footer
pdf.set_xy(0, 275)
pdf.set_font('Helvetica', '', 8)
pdf.set_text_color(148, 163, 184)
pdf.multi_cell(0, 4, 'Brenno Dangoni © 2026 | @brennodangoni\nEntrega média em 3 dias úteis. Projetos 100% Mobile Friendly.', align='C')

output_path = 'PROPOSTA_REAL_BRENNO.pdf'
pdf.output(output_path)
print(f'✅ PDF REAL gerado com sucesso: {output_path}')
