#!/usr/bin/env python3
"""Build the assessment PDF from its source.

    python3 scripts/assessment/build.py            # docs/assessment/assessment.json -> docs/assessment/Daleth-AAC-Assessment.pdf
    python3 scripts/assessment/build.py --format   # rewrite the source in its standard layout (clean diffs)

The source holds every word of the document; this script only lays it out (A4, Carlito, the navy /
teal colours, label chips, tables, boxes, contents page with page numbers, running footer).

Source structure (docs/assessment/assessment.json):
  meta      PDF title/subject/author, footer text, "updated" date (footer), contents title
  cover     title, subtitle, intro, facts ([label, value] rows: the date line is facts[0])
  chapters  [{title, same_page?, blocks: [...], sections?: [...]}]  each chapter starts a page
            (same_page: follows the previous chapter) and is listed in the contents
  blocks    one key each: {"p"}, {"small"}, {"lead"}, {"h2"}, {"h3"}, {"bullets": [...]},
            {"numbered": [...]}, {"box": {"style": update|info|note, "blocks": [...]}},
            {"table": {widths (points), header, rows, ...options}}, {"plan": [rows]} (launch-plan
            table: n, critical, what, who, cost, time, waits, status), {"diagram": {...}} (A2)
  sections  Part B: {num, title, in_short, questions: [{n, q, label, answer: [blocks], cost,
            owner, source, when}]}; label is app | estimate | decision | expert
Text may use <b>, <i> and <a href="...">; https:// addresses are linked by themselves.
A table cell may be {"chip": "app"} to show a label chip.

Needs ReportLab. Fonts: Carlito (the original's font; fonts-crosextra-carlito), else Lato
(fonts-lato), else DejaVu Sans; DejaVu Sans also draws the signs the main font lacks (the star).
"""
import argparse
import json
import os
import re
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, CondPageBreak, Flowable, Frame, KeepTogether, NextPageTemplate,
                                PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DEFAULT_SOURCE = os.path.join(ROOT, 'docs', 'assessment', 'assessment.json')
DEFAULT_OUT = os.path.join(ROOT, 'docs', 'assessment', 'Daleth-AAC-Assessment.pdf')

# ---------------------------------------------------------------- colours
TEXT = colors.HexColor('#222831')
NAVY = colors.HexColor('#1F3A5F')
TEAL = colors.HexColor('#2A7F8E')
GREY = colors.HexColor('#5A6270')
RULE = colors.HexColor('#D5DCE4')
ROW = colors.HexColor('#F1F4F8')
GREEN = colors.HexColor('#2E7D32')
BLUE = colors.HexColor('#1565C0')
ORANGE = colors.HexColor('#A65F00')
PURPLE = colors.HexColor('#6A1B9A')
UPDATE_BG = colors.HexColor('#EAF5EC')
INFO_BG = colors.HexColor('#E7F1F3')
NOTE_BG = colors.HexColor('#FFF4E0')
STAR_BG = colors.HexColor('#FFF4E0')
NOW_BG = colors.HexColor('#EEF6F0')
MIN_BG = colors.HexColor('#FFF8E6')
PURPLE_BG = colors.HexColor('#F5EEF8')
WHITE = colors.white

CHIPS = {
    'app': ('IN THE APP', GREEN),
    'estimate': ('ESTIMATE', BLUE),
    'decision': ('YOUR DECISION', ORANGE),
    'expert': ('NEEDS AN EXPERT', PURPLE),
}
BOX_STYLES = {  # background, left bar
    'update': (UPDATE_BG, GREEN),
    'info': (INFO_BG, TEAL),
    'note': (NOTE_BG, ORANGE),
}
DIAGRAM_STYLES = {  # fill, stroke
    'green': (UPDATE_BG, GREEN),
    'navy': (ROW, NAVY),
    'teal': (INFO_BG, TEAL),
    'purple': (PURPLE_BG, PURPLE),
}


def status_colour(status):
    s = status.lower()
    if s.startswith('done'):
        return GREEN
    if s.startswith('ready') or s.startswith('partly') or s.startswith('built') or s.startswith('draft'):
        return BLUE
    if s.startswith('optional') or s.startswith('not '):
        return GREY
    return ORANGE


# ---------------------------------------------------------------- page geometry
PAGE_W, PAGE_H = A4
MARGIN_X = 18 * mm
CONTENT_W = PAGE_W - 2 * MARGIN_X
TOP = 18 * mm            # frame top, from the top edge
BOTTOM = 18 * mm         # frame bottom, from the bottom edge
FOOTER_RULE_Y = 11 * mm
FOOTER_TEXT_Y = 7.2 * mm
Q_INDENT = 31.2          # Part B answers start under the question text
CHIP_W, CHIP_H = 68.1, 12.7

# ---------------------------------------------------------------- fonts
FONT_CANDIDATES = [
    ('/usr/share/fonts/truetype/crosextra', 'Carlito-Regular.ttf', 'Carlito-Bold.ttf', 'Carlito-Italic.ttf', 'Carlito-BoldItalic.ttf'),
    ('/usr/share/fonts/truetype/lato', 'Lato-Regular.ttf', 'Lato-Bold.ttf', 'Lato-Italic.ttf', 'Lato-BoldItalic.ttf'),
    ('/usr/share/fonts/truetype/dejavu', 'DejaVuSans.ttf', 'DejaVuSans-Bold.ttf', 'DejaVuSans-Oblique.ttf', 'DejaVuSans-BoldOblique.ttf'),
]
SYMBOL_FONT_FILE = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BODY, BOLD, ITALIC, SYMBOL = 'Body', 'Body-Bold', 'Body-Italic', 'Symbol-Sans'
_missing_glyphs = set()
_body_cmap = None


def register_fonts():
    global _body_cmap
    for folder, reg, bold, ital, bi in FONT_CANDIDATES:
        paths = [os.path.join(folder, f) for f in (reg, bold, ital, bi)]
        if all(os.path.exists(p) for p in paths):
            break
    else:
        sys.exit('No usable font found: install fonts-crosextra-carlito or fonts-lato.')
    pdfmetrics.registerFont(TTFont(BODY, paths[0]))
    pdfmetrics.registerFont(TTFont(BOLD, paths[1]))
    pdfmetrics.registerFont(TTFont(ITALIC, paths[2]))
    pdfmetrics.registerFont(TTFont('Body-BoldItalic', paths[3]))
    pdfmetrics.registerFontFamily(BODY, normal=BODY, bold=BOLD, italic=ITALIC, boldItalic='Body-BoldItalic')
    symbol = SYMBOL_FONT_FILE if os.path.exists(SYMBOL_FONT_FILE) else paths[0]
    pdfmetrics.registerFont(TTFont(SYMBOL, symbol))
    _body_cmap = set(pdfmetrics.getFont(BODY).face.charToGlyph.keys())
    return os.path.basename(paths[0])


# ---------------------------------------------------------------- inline text
URL_RE = re.compile(r'(?<!href=")(https?://[^\s<>"]+[^\s<>".,;:)])')


def rich(text, link_colour='#1F3A5F'):
    """Source text -> ReportLab paragraph markup."""
    if text is None:
        return ''
    s = re.sub(r'&(?!(amp|lt|gt|quot|#\d+);)', '&amp;', text)

    def link_plain(m):
        url = m.group(1)
        return '<a href="%s" color="%s"><u>%s</u></a>' % (url, link_colour, url)

    # link bare addresses (outside existing <a> tags)
    parts = re.split(r'(<a [^>]*>.*?</a>)', s)
    s = ''.join(p if p.startswith('<a ') else URL_RE.sub(link_plain, p) for p in parts)
    s = re.sub(r'<a href="([^"]+)">(.*?)</a>', r'<a href="\1" color="%s"><u>\2</u></a>' % link_colour, s)

    # signs missing from the body font go to the symbol font
    out = []
    in_tag = False
    for ch in s:
        if ch == '<':
            in_tag = True
        if not in_tag and ord(ch) > 127 and _body_cmap is not None and ord(ch) not in _body_cmap:
            _missing_glyphs.add(ch)
            out.append('<font name="%s">%s</font>' % (SYMBOL, ch))
        else:
            out.append(ch)
        if ch == '>':
            in_tag = False
    return ''.join(out)


# ---------------------------------------------------------------- styles
def S(name, **kw):
    base = dict(fontName=BODY, fontSize=9.6, leading=13.2, textColor=TEXT, alignment=TA_LEFT)
    base.update(kw)
    return ParagraphStyle(name, **base)


def make_styles():
    st = {}
    st['p'] = S('p', spaceAfter=3)
    st['small'] = S('small', fontSize=8.8, leading=12, spaceAfter=3)
    st['lead'] = S('lead', fontSize=10, leading=14)
    st['h1'] = S('h1', fontName=BOLD, fontSize=20, leading=24, textColor=NAVY, spaceAfter=6)
    st['h1s'] = S('h1s', fontName=BOLD, fontSize=20, leading=24, textColor=NAVY, spaceBefore=10, spaceAfter=6)
    st['h2'] = S('h2', fontName=BOLD, fontSize=13.5, leading=17, textColor=NAVY, spaceBefore=14, spaceAfter=6)
    st['h3'] = S('h3', fontName=BOLD, fontSize=11, leading=14, textColor=TEAL, spaceBefore=6, spaceAfter=3)
    st['bullet'] = S('bullet', leftIndent=10, bulletIndent=1, bulletFontName='Helvetica', bulletFontSize=10, spaceAfter=1)
    st['qnum'] = S('qnum', fontName=BOLD, fontSize=10.2, leading=13.4, textColor=TEAL)
    st['qtext'] = S('qtext', fontName=BOLD, fontSize=10.2, leading=13.4, textColor=NAVY)
    st['grid'] = S('grid', fontSize=8.2, leading=10.6, textColor=GREY)
    st['cell'] = S('cell', fontSize=8.4, leading=10.6)
    st['cellh'] = S('cellh', fontName=BOLD, fontSize=8.4, leading=10.6, textColor=WHITE)
    st['cellm'] = S('cellm', fontSize=7.8, leading=9.6, textColor=GREY)
    st['pcell'] = S('pcell', fontSize=7.8, leading=9.8)
    st['pcellh'] = S('pcellh', fontName=BOLD, fontSize=7.8, leading=9.8, textColor=WHITE)
    st['num'] = S('num', fontName=BOLD, textColor=TEAL)
    st['toc'] = S('toc', fontSize=10.2, leading=14)
    st['cover_title'] = S('cover_title', fontName=BOLD, fontSize=30, leading=36, textColor=NAVY)
    st['cover_sub'] = S('cover_sub', fontSize=14, leading=18, textColor=GREY)
    st['cover_intro'] = S('cover_intro', fontSize=10, leading=14)
    st['fact_label'] = S('fact_label', fontName=BOLD)
    st['diagram_title'] = S('diagram_title', fontName=BOLD, fontSize=9.5, textColor=NAVY)
    return st


ST = None


def para(text, style, **kw):
    if kw:
        style = ParagraphStyle(style.name + '_x', parent=style, **kw)
    return Paragraph(rich(text), style)


# ---------------------------------------------------------------- flowables
class Chip(Flowable):
    def __init__(self, key, width=CHIP_W, height=CHIP_H):
        Flowable.__init__(self)
        self.label, self.colour = CHIPS[key]
        self.width, self.height = width, height

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(self.colour)
        c.rect(0, 0, self.width, self.height, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.setFont(BOLD, 7)
        c.drawCentredString(self.width / 2, 4.1, self.label)


class Diagram(Flowable):
    """A2: the application in one picture (boxes and arrows, coordinates from the top-left)."""

    def __init__(self, spec):
        Flowable.__init__(self)
        self.spec = spec
        self.width = spec.get('width', CONTENT_W)
        self.height = spec['height']

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        H = self.height
        for b in self.spec['boxes']:
            fill, stroke = DIAGRAM_STYLES[b.get('style', 'navy')]
            c.setFillColor(fill)
            c.setStrokeColor(stroke)
            c.setLineWidth(1)
            c.roundRect(b['x'], H - b['y'] - b['h'], b['w'], b['h'], 6, stroke=1, fill=1)
            tx = b['x'] + 8
            c.setFillColor(NAVY)
            c.setFont(BOLD, 9.5)
            c.drawString(tx, H - b['y'] - 15.3, b['title'])
            c.setFillColor(TEXT)
            c.setFont(BODY, 8)
            y = H - b['y'] - 28.3
            for line in b.get('lines', []):
                c.drawString(tx, y, line)
                y -= 11
        c.setStrokeColor(GREY)
        c.setFillColor(GREY)
        c.setLineWidth(1)
        for a in self.spec.get('arrows', []):
            (x0, y0), (x1, y1) = a['from'], a['to']
            y0, y1 = H - y0, H - y1
            if a.get('dashed'):
                c.setDash(2, 2)
            c.line(x0, y0, x1, y1)
            c.setDash()
            # arrow head
            import math
            ang = math.atan2(y1 - y0, x1 - x0)
            L, w = 5.5, 2.6
            bx, by = x1 - L * math.cos(ang), y1 - L * math.sin(ang)
            px, py = -math.sin(ang) * w, math.cos(ang) * w
            p = c.beginPath()
            p.moveTo(x1, y1)
            p.lineTo(bx + px, by + py)
            p.lineTo(bx - px, by - py)
            p.close()
            c.drawPath(p, stroke=1, fill=1)


class Heading(Paragraph):
    """An H1 that goes to the contents page and the PDF outline."""

    def __init__(self, text, style, toc=True):
        Paragraph.__init__(self, rich(text), style)
        self.toc_text = re.sub(r'<[^>]+>', '', text) if toc else None


# ---------------------------------------------------------------- blocks
def box(blocks, style, width=CONTENT_W):
    bg, bar = BOX_STYLES[style]
    inner = []
    for b in blocks:
        inner.extend(render_block(b, width - 18))
    t = Table([[inner]], colWidths=[width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg),
        ('LINEBEFORE', (0, 0), (0, -1), 3, bar),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
        ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    t.spaceBefore = 5
    t.spaceAfter = 10
    return t


def scaled(widths, total=CONTENT_W):
    s = sum(widths)
    return [w * total / s for w in widths]


def cell(v, style):
    if isinstance(v, dict) and 'chip' in v:
        return Chip(v['chip'])
    return para(v, style)


def table(spec):
    size = spec.get('size', 8.4)
    small = size < 8.4
    cst = ST['pcell'] if small else ST['cell']
    hst = ST['pcellh'] if small else ST['cellh']
    pad = spec.get('pad', 4)
    vpad = spec.get('vpad', 3)
    align = spec.get('align')
    muted = set(spec.get('muted_cols', []))
    widths = scaled(spec['widths'])

    def cst_for(i):
        st = ST['cellm'] if i in muted else cst
        if align and align[i] == 'right':
            st = ParagraphStyle(st.name + '_r', parent=st, alignment=TA_RIGHT)
        return st

    data = [[para(h, hst) for h in spec['header']]]
    first_body = 1
    if spec.get('subheader'):
        data.append([para(h, ParagraphStyle('sub_r', parent=cst, alignment=TA_RIGHT) if align and align[i] == 'right' else cst)
                     for i, h in enumerate(spec['subheader'])])
        first_body = 2
    for r in spec['rows']:
        data.append([cell(v, cst_for(i)) for i, v in enumerate(r)])
    t = Table(data, colWidths=widths, repeatRows=first_body)
    n = len(data)
    cmds = [
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE' if spec.get('valign') == 'middle' else 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), pad),
        ('RIGHTPADDING', (0, 0), (-1, -1), pad),
        ('TOPPADDING', (0, 0), (-1, -1), vpad),
        ('BOTTOMPADDING', (0, 0), (-1, -1), vpad),
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('LINEBELOW', (0, 0), (-1, -1), spec.get('rule', 0.4), RULE),
    ]
    if spec.get('subheader'):
        cmds.append(('BACKGROUND', (0, 1), (-1, 1), ROW))
    for a, b in spec.get('header_spans', []):
        cmds.append(('SPAN', (a, 0), (b, 0)))
    if spec.get('stripes', True):
        cmds.append(('ROWBACKGROUNDS', (0, first_body), (-1, -1), [WHITE, ROW]))
    for c in spec.get('shade_cols', []):
        cmds.append(('BACKGROUND', (c, first_body), (c, -1), NOW_BG))
    for r in spec.get('shade_rows_label', []):
        cmds.append(('BACKGROUND', (0, r + first_body), (1, r + first_body), MIN_BG))
    for r, w in spec.get('rule_above', {}).items():
        cmds.append(('LINEABOVE', (0, int(r) + first_body), (-1, int(r) + first_body), w, NAVY))
    for c in spec.get('group_lines', []):
        cmds.append(('LINEBEFORE', (c, 0), (c, -1), 0.6, RULE) if c < len(widths) else ('LINEAFTER', (c - 1, 0), (c - 1, -1), 0.6, RULE))
    t.setStyle(TableStyle(cmds))
    t.spaceBefore = 3
    t.spaceAfter = 5
    return t


PLAN_WIDTHS = [28.4, 175.7, 62.4, 68.0, 51.0, 51.1, 56.7]
PLAN_HEADER = ['#', 'What to do', 'Who', 'Cost', 'Time', 'Waits for', 'Status']


def plan_table(rows):
    data = [[para(h, ST['pcellh']) for h in PLAN_HEADER]]
    cmds = [
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 2.6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2.6),
        ('TOPPADDING', (0, 0), (-1, -1), 2.2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.2),
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('LINEBELOW', (0, 0), (-1, -1), 0.3, RULE),
    ]
    for i, r in enumerate(rows):
        ri = i + 1
        if r.get('critical'):
            num = '<font color="#A65F00">★ <b>%s</b></font>' % r['n']
            cmds.append(('BACKGROUND', (0, ri), (0, ri), STAR_BG))
        else:
            num = r['n']
            if i % 2 == 1:
                cmds.append(('BACKGROUND', (0, ri), (-1, ri), ROW))
        colour = status_colour(r['status']).hexval().replace('0x', '#')
        status = '<font color="%s"><b>%s</b></font>' % (colour, r['status'])
        data.append([para(num, ST['pcell'])] + [para(r[k], ST['pcell']) for k in ('what', 'who', 'cost', 'time', 'waits')]
                    + [para(status, ST['pcell'])])
    t = Table(data, colWidths=scaled(PLAN_WIDTHS), repeatRows=1)
    t.setStyle(TableStyle(cmds))
    t.spaceBefore = 4
    t.spaceAfter = 6
    return t


def numbered(items, width=CONTENT_W):
    data = [[para(str(i + 1), ST['num']), para(t, ST['p'], spaceAfter=0)] for i, t in enumerate(items)]
    t = Table(data, colWidths=[22.7, width - 22.7])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LINEBELOW', (0, 0), (-1, -1), 0.3, RULE),
    ]))
    t.spaceBefore = 2
    t.spaceAfter = 6
    return t


def bullets(items, indent=0, style='p'):
    out = []
    base = ST['bullet']
    if style == 'small':
        base = ParagraphStyle('bullet_s', parent=base, fontSize=8.8, leading=12)
    st = ParagraphStyle('bullet_%s' % indent, parent=base, leftIndent=base.leftIndent + indent,
                        bulletIndent=base.bulletIndent + indent)
    for it in items:
        out.append(Paragraph(rich(it), st, bulletText='•'))
    if out:
        out[-1].style = ParagraphStyle(st.name + '_last', parent=st, spaceAfter=0)
    return out


def render_block(b, width=CONTENT_W, indent=0):
    """One source block -> list of flowables."""
    for k in ('p', 'small', 'lead'):
        if k in b:
            if indent:
                return [para(b[k], ST[k], leftIndent=indent)]
            return [para(b[k], ST[k])]
    if 'h2' in b:
        return [para(b['h2'], ST['h2'])]
    if 'h3' in b:
        return [para(b['h3'], ST['h3'])]
    if 'bullets' in b:
        return bullets(b['bullets'], indent, b.get('style', 'p'))
    if 'numbered' in b:
        return [numbered(b['numbered'], width)]
    if 'table' in b:
        return [table(b['table'])]
    if 'plan' in b:
        return [plan_table(b['plan'])]
    if 'box' in b:
        return [box(b['box']['blocks'], b['box'].get('style', 'info'), width)]
    if 'diagram' in b:
        d = Diagram(b['diagram'])
        d.spaceBefore = 6
        d.spaceAfter = 10
        return [d]
    if 'page_break' in b:
        return [PageBreak()]
    raise ValueError('Unknown block: %r' % (list(b.keys()),))


BIG = ('table', 'plan', 'numbered', 'diagram')


def keep_headings(blocks):
    """A heading stays with what follows it: up to the first table or picture before the next
    heading, otherwise the next block."""
    flow = []
    i = 0
    while i < len(blocks):
        b = blocks[i]
        if 'h2' in b or 'h3' in b:
            j = i + 1
            end = min(i + 2, len(blocks))
            while j < len(blocks) and not ('h2' in blocks[j] or 'h3' in blocks[j]):
                if any(k in blocks[j] for k in BIG):
                    end = j + 1
                    break
                j += 1
            group = []
            for x in blocks[i:end]:
                group.extend(render_block(x))
            last = blocks[end - 1]
            if len(last.get('table', {}).get('rows', [])) > 18 or len(last.get('plan', [])) > 18:
                # a table longer than a page: start it low on a page rather than leave a gap
                flow.append(CondPageBreak(160))
                flow.extend(group)
            else:
                flow.append(KeepTogether(group))
            i = end
        else:
            flow.extend(render_block(b))
            i += 1
    return flow


def question(q):
    head = Table([[para(q['n'], ST['qnum']), para(q['q'], ST['qtext']), Chip(q['label'])]],
                 colWidths=[Q_INDENT, CONTENT_W - Q_INDENT - CHIP_W - 6.2, CHIP_W + 6.2])
    head.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('TOPPADDING', (2, 0), (2, 0), -1.0),
    ]))
    head.spaceAfter = 3
    flow = [head]
    for b in q['answer']:
        flow.extend(render_block(b, CONTENT_W - Q_INDENT, indent=Q_INDENT))
    label = '<font color="#1F3A5F"><b>%s</b></font> %s'
    g = Table([[para(label % ('Cost', q['cost'] or '–'), ST['grid']), para(label % ('Owner', q['owner'] or '–'), ST['grid'])],
               [para(label % ('Source', q['source'] or '–'), ST['grid']), para(label % ('When', q['when'] or '–'), ST['grid'])]],
              colWidths=[258.8, CONTENT_W - Q_INDENT - 258.8], hAlign='RIGHT')
    g.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), ROW),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 2.2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.2),
    ]))
    g.spaceBefore = 5
    g.spaceAfter = 9
    flow.append(g)
    return KeepTogether(flow)


# ---------------------------------------------------------------- document
class Doc(BaseDocTemplate):
    def __init__(self, filename, src, **kw):
        BaseDocTemplate.__init__(self, filename, pagesize=A4, **kw)
        self.src = src
        frame = Frame(MARGIN_X, BOTTOM, CONTENT_W, PAGE_H - TOP - BOTTOM, id='body',
                      leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate('cover', [frame], onPage=self.cover_page),
            PageTemplate('normal', [frame], onPage=self.normal_page),
        ])

    def cover_page(self, c, doc):
        c.saveState()
        c.setFillColor(NAVY)
        c.rect(0, PAGE_H - 9 * mm, PAGE_W, 9 * mm, stroke=0, fill=1)
        c.setFillColor(TEAL)
        c.rect(0, 0, PAGE_W, 5 * mm, stroke=0, fill=1)
        c.restoreState()

    def normal_page(self, c, doc):
        m = self.src['meta']
        c.saveState()
        c.setStrokeColor(RULE)
        c.setLineWidth(0.5)
        c.line(MARGIN_X, FOOTER_RULE_Y, PAGE_W - MARGIN_X, FOOTER_RULE_Y)
        c.setFillColor(GREY)
        c.setFont(BODY, 8)
        c.drawString(MARGIN_X, FOOTER_TEXT_Y, '%s · updated %s' % (m['footer'], m['updated']))
        c.drawRightString(PAGE_W - MARGIN_X, FOOTER_TEXT_Y, str(doc.page))
        c.restoreState()

    def afterFlowable(self, f):
        text = getattr(f, 'toc_text', None)
        if text:
            key = 'h1-' + re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=0, closed=False)
            self.notify('TOCEntry', (0, text, self.page, key))


def cover(src):
    cv = src['cover']
    flow = [Spacer(1, 147.4),
            para(cv['title'], ST['cover_title']), Spacer(1, 5),
            para(cv['subtitle'], ST['cover_sub']), Spacer(1, 19),
            para(cv['intro'], ST['cover_intro']), Spacer(1, 40)]
    rows = [[para(k, ST['fact_label']), para(v, ST['p'], spaceAfter=0)] for k, v in cv['facts']]
    t = Table(rows, colWidths=[90.7, CONTENT_W - 90.7])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEBELOW', (0, 0), (-1, -1), 0.4, RULE),
    ]))
    flow.append(t)
    return flow


def contents(src):
    toc = TableOfContents(dotsMinLevel=0)
    toc.levelStyles = [ParagraphStyle('toc0', parent=ST['toc'])]
    return [Heading(src['meta'].get('contents_title', 'Contents'), ST['h1'], toc=False), Spacer(1, 4), toc]


def chapter(ch, first):
    flow = []
    if not first and not ch.get('same_page'):
        flow.append(PageBreak())
    flow.append(Heading(ch['title'], ST['h1s'] if ch.get('same_page') else ST['h1']))
    flow.extend(keep_headings(ch.get('blocks', [])))
    for i, s in enumerate(ch.get('sections', [])):
        if i > 0:
            flow.append(PageBreak())
        flow.append(Heading('%s · %s' % (s['num'], s['title']), ST['h1s'] if i == 0 else ST['h1']))
        if s.get('in_short'):
            ib = box([{'lead': '<b>In short.</b> ' + s['in_short']}], 'info')
            ib.spaceBefore = 0
            flow.append(ib)
        for q in s['questions']:
            flow.append(question(q))
    return flow


def build(src_path, out_path):
    global ST
    font = register_fonts()
    ST = make_styles()
    src = json.load(open(src_path, encoding='utf-8'))
    m = src['meta']
    doc = Doc(out_path, src, title=m.get('pdf_title'), subject=m.get('pdf_subject'), author=m.get('pdf_author'),
              leftMargin=MARGIN_X, rightMargin=MARGIN_X, topMargin=TOP, bottomMargin=BOTTOM)
    story = [NextPageTemplate('cover')] + cover(src) + [NextPageTemplate('normal'), PageBreak()] + contents(src)
    story.append(PageBreak())
    for i, ch in enumerate(src['chapters']):
        story.extend(chapter(ch, i == 0))
    doc.multiBuild(story)
    if _missing_glyphs:
        print('signs drawn with the symbol font: %s' % ' '.join(sorted(_missing_glyphs)))
    print('%s: %d pages (font %s)' % (os.path.relpath(out_path, ROOT), doc.page, font))


def _dump(o, ind=0, key=None):
    """JSON with one line per paragraph, table row or short list (stable, readable diffs)."""
    pad = ' ' * ind
    flat = json.dumps(o, ensure_ascii=False)
    if not isinstance(o, (dict, list)) or len(flat) + ind <= 110 or key == 'rows_item':
        return flat
    if isinstance(o, list):
        if all(not isinstance(x, (dict, list)) for x in o) and len(flat) + ind <= 160:
            return flat
        inner = [(' ' * (ind + 1)) + _dump(x, ind + 1, 'rows_item' if key == 'rows' else None) for x in o]
        return '[\n' + ',\n'.join(inner) + '\n' + pad + ']'
    inner = ['%s%s: %s' % (' ' * (ind + 1), json.dumps(k, ensure_ascii=False), _dump(v, ind + 1, k)) for k, v in o.items()]
    return '{\n' + ',\n'.join(inner) + '\n' + pad + '}'


def format_source(path):
    src = json.load(open(path, encoding='utf-8'))
    with open(path, 'w', encoding='utf-8') as f:
        f.write(_dump(src) + '\n')
    print('formatted %s' % os.path.relpath(path, ROOT))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--source', default=DEFAULT_SOURCE)
    ap.add_argument('--out', default=DEFAULT_OUT)
    ap.add_argument('--format', action='store_true', help='rewrite the source in its standard layout and stop')
    a = ap.parse_args()
    if a.format:
        format_source(a.source)
    else:
        build(a.source, a.out)
