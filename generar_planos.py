#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Planos técnicos AquaGuard — estilo blueprint (fondo azul, línea blanca).
Dibujos vectoriales reales de cada componente, con cotas y vistas.
"""
import math
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
import os

MM = 72.0 / 25.4
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "planos")
os.makedirs(OUT, exist_ok=True)

# Fuente con glifos unicode completos (subíndices, Ω, flechas, ✓)
_FONT_DIR = "/usr/share/fonts/TTF"
pdfmetrics.registerFont(TTFont("DejaVu", os.path.join(_FONT_DIR, "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", os.path.join(_FONT_DIR, "DejaVuSans-Bold.ttf")))
REG, BOLD = "DejaVu", "DejaVu-Bold"

BG     = HexColor("#0d3b66")   # azul blueprint
WHITE  = HexColor("#ffffff")
THIN   = HexColor("#a9c7e8")   # línea fina/secundaria
AMBER  = HexColor("#ffd166")   # acentos / títulos de sección
WATER  = HexColor("#3fa7d6")   # agua / detalle

# ---------------------------------------------------------------- Pen
class Pen:
    """Lápiz con pila de transformaciones; mantiene grosores y texto
    en puntos absolutos sin importar la escala acumulada."""
    def __init__(self, c):
        self.c = c
        self.s = [1.0]
    @property
    def sc(self):
        return self.s[-1]
    def push(self, ox, oy, scale=1.0):
        self.c.saveState()
        self.c.translate(ox, oy)
        self.c.scale(scale, scale)
        self.s.append(self.sc * scale)
    def pop(self):
        self.c.restoreState()
        self.s.pop()
    # primitivas (coordenadas locales; grosor/tam en pt absolutos)
    def line(self, x1, y1, x2, y2, w=1.0, color=WHITE, dash=None):
        self.c.setStrokeColor(color)
        self.c.setLineWidth(w / self.sc)
        self.c.setDash([d / self.sc for d in dash] if dash else [])
        self.c.line(x1, y1, x2, y2)
        self.c.setDash([])
    def rect(self, x, y, w, h, weight=1.0, color=WHITE, r=0, fill=None, dash=None):
        self.c.setStrokeColor(color)
        self.c.setLineWidth(weight / self.sc)
        self.c.setDash([d / self.sc for d in dash] if dash else [])
        if fill is not None:
            self.c.setFillColor(fill)
        if r > 0:
            self.c.roundRect(x, y, w, h, r, stroke=1, fill=1 if fill is not None else 0)
        else:
            self.c.rect(x, y, w, h, stroke=1, fill=1 if fill is not None else 0)
        self.c.setDash([])
    def circle(self, x, y, rad, weight=1.0, color=WHITE, fill=None, dash=None):
        self.c.setStrokeColor(color)
        self.c.setLineWidth(weight / self.sc)
        self.c.setDash([d / self.sc for d in dash] if dash else [])
        if fill is not None:
            self.c.setFillColor(fill)
        self.c.circle(x, y, rad, stroke=1, fill=1 if fill is not None else 0)
        self.c.setDash([])
    def arc(self, x1, y1, x2, y2, start, extent, w=1.0, color=WHITE):
        self.c.setStrokeColor(color)
        self.c.setLineWidth(w / self.sc)
        self.c.arc(x1, y1, x2, y2, start, extent)
    def poly(self, pts, weight=1.0, color=WHITE, fill=None, close=True):
        p = self.c.beginPath()
        p.moveTo(*pts[0])
        for q in pts[1:]:
            p.lineTo(*q)
        if close:
            p.close()
        self.c.setStrokeColor(color)
        self.c.setLineWidth(weight / self.sc)
        if fill is not None:
            self.c.setFillColor(fill)
        self.c.drawPath(p, stroke=1, fill=1 if fill is not None else 0)
    def text(self, x, y, s, size=8, color=WHITE, anchor="start", font=REG):
        self.c.setFillColor(color)
        self.c.setFont(font, size / self.sc)
        if anchor == "middle":
            self.c.drawCentredString(x, y, s)
        elif anchor == "end":
            self.c.drawRightString(x, y, s)
        else:
            self.c.drawString(x, y, s)
    # cota horizontal
    def dim_h(self, x1, x2, y, txt, tick=2.2, size=7, color=THIN, above=True):
        self.line(x1, y, x2, y, 0.5, color)
        for x in (x1, x2):
            self.line(x, y - tick, x, y + tick, 0.5, color)
        midy = y + 1.2 if above else y - 3.2
        self.text((x1 + x2) / 2, midy, txt, size, color, "middle")
    # cota vertical
    def dim_v(self, y1, y2, x, txt, tick=2.2, size=7, color=THIN, right=True):
        self.line(x, y1, x, y2, 0.5, color)
        for y in (y1, y2):
            self.line(x - tick, y, x + tick, y, 0.5, color)
        self.c.saveState()
        self.c.translate(x + (1.6 if right else -1.6), (y1 + y2) / 2)
        self.c.rotate(90)
        self.c.setFillColor(color)
        self.c.setFont(REG, size / self.sc)
        self.c.drawCentredString(0, 0, txt)
        self.c.restoreState()
    # diámetro / agujero con ejes
    def hole(self, x, y, rad, txt=None, ext=3):
        self.circle(x, y, rad, 0.8, WHITE)
        self.line(x - rad - ext, y, x + rad + ext, y, 0.4, THIN, dash=[3, 2])
        self.line(x, y - rad - ext, x, y + rad + ext, 0.4, THIN, dash=[3, 2])
        if txt:
            self.text(x + rad + 1.5, y + rad + 1.0, txt, 6.5, THIN)
    def leader(self, x, y, tx, ty, txt, size=7, color=WHITE, anchor="start"):
        self.line(x, y, tx, ty, 0.5, color)
        self.circle(x, y, 0.6, 0.5, color, fill=color)
        self.text(tx + (1.5 if anchor == "start" else -1.5), ty - 1.0, txt, size, color, anchor)


# ---------------------------------------------------------------- Página base
def new_page(filename, title, subtitle=""):
    c = canvas.Canvas(os.path.join(OUT, filename), pagesize=landscape(A3))
    W, H = landscape(A3)
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    p = Pen(c)
    m = 10 * MM
    # marco doble
    p.rect(m, m, W - 2*m, H - 2*m, 1.4, WHITE)
    p.rect(m + 3, m + 3, W - 2*m - 6, H - 2*m - 6, 0.5, THIN)
    # esquinas tipo plano
    for cx, cy in [(m, m), (W-m, m), (m, H-m), (W-m, H-m)]:
        p.line(cx, cy, cx, cy, 1)  # noop placeholder
    return c, p, W, H, m


def title_block(p, W, H, m, plano_no, plano_name, scale="S/E", units="mm"):
    bw, bh = 95*MM, 30*MM
    x0, y0 = W - m - 3 - bw, m + 3
    p.rect(x0, y0, bw, bh, 1.0, WHITE)
    p.line(x0, y0 + bh*0.62, x0 + bw, y0 + bh*0.62, 0.6, WHITE)
    p.line(x0, y0 + bh*0.32, x0 + bw, y0 + bh*0.32, 0.6, WHITE)
    p.line(x0 + bw*0.62, y0, x0 + bw*0.62, y0 + bh*0.62, 0.6, WHITE)
    p.text(x0 + 4, y0 + bh - 11, "AquaGuard", 13, WHITE, font=BOLD)
    p.text(x0 + 4, y0 + bh - 20, "Automatización de llenado de tanques", 6.5, THIN)
    p.text(x0 + 4, y0 + bh*0.62 - 8, plano_name, 7.5, AMBER, font=BOLD)
    p.text(x0 + bw*0.62 + 3, y0 + bh*0.62 - 8, f"PLANO {plano_no}", 8, WHITE, font=BOLD)
    p.text(x0 + 4, y0 + 9, f"ESC: {scale}", 6.5, THIN)
    p.text(x0 + 4, y0 + 3, f"COTAS EN {units}", 6.5, THIN)
    p.text(x0 + bw*0.34, y0 + 9, datetime.now().strftime("%d/%m/%Y"), 6.5, THIN)
    p.text(x0 + bw*0.34, y0 + 3, "Proyecto Universidad", 6.5, THIN)
    p.text(x0 + bw - 3, y0 + 9, "A3", 9, WHITE, "end", font=BOLD)


def section_label(p, x, y, txt):
    p.text(x, y, txt, 10, AMBER, font=BOLD)
    p.line(x, y - 2.5, x + p.c.stringWidth(txt, BOLD, 10/p.sc)*p.sc, y - 2.5, 0.8, AMBER)


# ================================================================ COMPONENTES
# Cada componente se dibuja en coordenadas locales en mm, origen abajo-izq.

def comp_hcsr04(p, scale=1.0, pins=True):
    """HC-SR04: PCB con dos transductores + cristal + 4 pines. ~45x20mm."""
    p.push(0, 0, scale)
    p.rect(0, 0, 45, 20, 1.0, WHITE, r=1)            # PCB
    for cx in (12, 33):                               # transductores
        p.circle(cx, 12.5, 8.2, 1.0, WHITE)
        p.circle(cx, 12.5, 6.8, 0.5, THIN)
        for a in range(0, 360, 30):                   # malla
            x = cx + 6.8*math.cos(math.radians(a))
            y = 12.5 + 6.8*math.sin(math.radians(a))
            p.line(cx, 12.5, x, y, 0.25, THIN)
    p.rect(20, 8, 5, 4.5, 0.6, THIN)                  # cristal
    p.text(22.5, 9.4, "", 4)
    if pins:
        for i, lab in enumerate(["Vcc", "Tg", "Ec", "Gnd"]):
            x = 13.5 + i*6
            p.line(x, 0, x, -3.2, 0.8, WHITE)
            p.text(x, -6.2, lab, 4.6, THIN, "middle")
    p.text(22.5, 21.6, "HC-SR04", 5.2, WHITE, "middle", font=BOLD)
    p.pop()


def comp_nodemcu(p, scale=1.0):
    """ESP8266 NodeMCU ~58x26mm con antena, lata RF, USB y pines."""
    p.push(0, 0, scale)
    p.rect(0, 0, 58, 26, 1.0, WHITE, r=1.2)
    p.rect(-3.5, 9, 4.5, 8, 0.8, WHITE)               # micro USB
    p.rect(33, 5, 22, 16, 0.8, THIN, r=0.8)           # lata RF (ESP-12)
    for hx in range(36, 55, 3):                        # tramado lata
        p.line(hx, 5, hx, 21, 0.3, THIN)
    p.text(44, 12, "ESP-12", 4.4, THIN, "middle")
    # antena PCB serpenteada
    ax, ay = 49, 21.5
    pts = []
    for i in range(7):
        pts.append((ax + i*1.1, ay + (2.4 if i % 2 else 0)))
    p.poly(pts, 0.6, WHITE, close=False)
    # filas de pines
    for i in range(15):
        p.circle(3 + i*3.6, 2.0, 0.9, 0.5, THIN)
        p.circle(3 + i*3.6, 24.0, 0.9, 0.5, THIN)
    # botones
    p.rect(2, 4.5, 4, 3, 0.5, THIN)
    p.rect(2, 18.5, 4, 3, 0.5, THIN)
    p.text(29, 28, "ESP8266 NodeMCU", 5.2, WHITE, "middle", font=BOLD)
    p.pop()


def comp_relay(p, scale=1.0):
    """Módulo relé 8 canales ~75x42mm."""
    p.push(0, 0, scale)
    p.rect(0, 0, 75, 42, 1.0, WHITE, r=1.2)
    # 8 relés (cubos azules)
    for i in range(8):
        x = 4 + i*8.6
        p.rect(x, 18, 7, 16, 0.8, WHITE)
        p.line(x, 30, x+7, 30, 0.4, THIN)
        # bornera de tornillo arriba (COM/NO/NC)
        for j in range(3):
            p.circle(x + 1.4 + j*2.1, 38, 1.0, 0.5, THIN)
    # opto-acopladores + LEDs (fila inferior)
    for i in range(8):
        x = 5 + i*8.6
        p.rect(x, 8, 5, 5, 0.5, THIN)
        p.circle(x + 2.5, 4, 1.0, 0.5, THIN)
    # header de entrada
    for i in range(10):
        p.circle(4 + i*2.2, 1.5, 0.8, 0.5, THIN)
    p.text(37.5, 44, "MÓDULO RELÉ 8 CANALES", 5.2, WHITE, "middle", font=BOLD)
    p.pop()


def comp_fc28(p, scale=1.0):
    """Sensor humedad FC-28: sonda (horquilla) + módulo comparador."""
    p.push(0, 0, scale)
    # sonda
    p.rect(0, 14, 12, 5, 0.8, WHITE, r=0.5)
    p.poly([(2, 14), (1.5, 0), (3, 0), (3.4, 14)], 0.8, WHITE)
    p.poly([(9, 14), (8.6, 0), (10.1, 0), (10.5, 14)], 0.8, WHITE)
    p.text(6, 20.5, "sonda", 4.4, THIN, "middle")
    # módulo comparador
    p.push(20, 6, 1.0)
    p.rect(0, 0, 26, 12, 0.9, WHITE, r=0.8)
    p.rect(3, 3, 6, 6, 0.6, THIN)                      # LM393
    p.text(6, 5.2, "393", 3.6, THIN, "middle")
    p.circle(16, 6, 3, 0.6, THIN)                      # potenciómetro
    p.line(16, 6, 18, 8, 0.5, THIN)
    for i, lab in enumerate(["A0", "D0", "G", "V"]):    # pines
        x = 21
        p.line(26, 2 + i*2.6, 29, 2 + i*2.6, 0.6, WHITE)
        p.text(30, 1.2 + i*2.6, lab, 3.6, THIN)
    p.text(13, 14, "módulo FC-28", 4.4, THIN, "middle")
    p.pop()
    p.text(20, -4, "Sensor de humedad FC-28 / YL-69", 5.0, WHITE, font=BOLD)
    p.pop()


def comp_pump(p, scale=1.0):
    """Bomba 12V DC: motor cilíndrico + voluta + barbas."""
    p.push(0, 0, scale)
    p.rect(8, 4, 28, 18, 1.0, WHITE, r=2)              # cuerpo motor
    for hx in range(12, 36, 4):
        p.line(hx, 4, hx, 22, 0.3, THIN)
    p.circle(8, 13, 9, 1.0, WHITE)                     # voluta (cabezal)
    p.circle(8, 13, 5.5, 0.5, THIN)
    p.rect(-2, 16, 5, 4, 0.8, WHITE)                   # salida
    p.poly([(3, 6), (3, 10), (-2, 8.5), (-2, 7.5)], 0.8, WHITE)  # entrada
    # cables
    p.line(36, 17, 42, 19, 0.9, WHITE)
    p.line(36, 9, 42, 7, 0.9, THIN)
    p.text(43, 18.5, "+ (rojo)", 4.2, WHITE)
    p.text(43, 6.5, "- (negro)", 4.2, THIN)
    p.text(18, 24, "BOMBA 12V DC", 5.0, WHITE, "middle", font=BOLD)
    p.pop()


def comp_estop(p, scale=1.0):
    """Paro de emergencia (vista superior): hongo rojo."""
    p.push(0, 0, scale)
    p.circle(0, 0, 11, 1.2, WHITE)
    p.circle(0, 0, 7.5, 0.6, THIN)
    p.text(0, -1.6, "STOP", 5, WHITE, "middle", font=BOLD)
    p.text(0, 14, "PARO E-STOP", 5, WHITE, "middle", font=BOLD)
    p.pop()


def comp_power(p, scale=1.0):
    """Fuente 12V DC."""
    p.push(0, 0, scale)
    p.rect(0, 0, 34, 20, 1.0, WHITE, r=1.5)
    p.line(0, 14, 34, 14, 0.5, THIN)
    p.text(17, 8, "12V  DC", 6, WHITE, "middle", font=BOLD)
    p.text(17, 3, "2A — 24W", 4.6, THIN, "middle")
    p.text(17, 15.5, "FUENTE", 4.6, THIN, "middle")
    # salida +/-
    p.line(34, 5, 39, 5, 0.9, WHITE);  p.text(40, 4, "+", 6, WHITE)
    p.line(34, 12, 39, 12, 0.9, THIN); p.text(40, 11, "-", 6, THIN)
    p.pop()


# ================================================================ PLANO 1
def plano_circuito():
    c, p, W, H, m = new_page("01_Circuito_General.pdf", "Circuito general")
    title_block(p, W, H, m, "01/04", "CONEXIONADO GENERAL")
    p.text(m + 6, H - m - 14, "CIRCUITO GENERAL", 16, WHITE, font=BOLD)
    p.text(m + 6, H - m - 24, "Esquema de conexión de todos los componentes del sistema", 8, THIN)

    # posiciones (en pt) de cada bloque de componente
    sc = MM * 1.35
    # NodeMCU centro
    nx, ny = W*0.42, H*0.52
    comp_nodemcu(p_at(p, nx, ny), sc)
    # HC-SR04 arriba-izq
    comp_hcsr04(p_at(p, W*0.14, H*0.74), sc)
    # FC-28 abajo-izq
    comp_fc28(p_at(p, W*0.11, H*0.30), sc)
    # Relé derecha
    comp_relay(p_at(p, W*0.66, H*0.62), sc)
    # Bomba derecha-abajo
    comp_pump(p_at(p, W*0.70, H*0.26), sc)
    # Fuente abajo-centro
    comp_power(p_at(p, W*0.45, H*0.16), sc)
    # E-STOP izq-centro
    comp_estop(p_at(p, W*0.17, H*0.50), sc)

    # --- nodos de pin del NodeMCU (coordenadas absolutas) ---
    def pin(frac):  # devuelve (x,y) sobre el borde del NodeMCU
        return (nx + frac[0]*sc, ny + frac[1]*sc)
    # bordes aproximados del nodemcu local: ancho 58, alto 26
    P_TRIG = (nx + 7*sc,  ny + 26*sc)
    P_ECHO = (nx + 11*sc, ny + 26*sc)
    P_A0   = (nx + 0*sc,  ny + 13*sc)   # usaremos lado izq
    P_VIN  = (nx + 18*sc, ny + 0*sc)
    P_3V3  = (nx + 25*sc, ny + 0*sc)
    P_GND  = (nx + 32*sc, ny + 0*sc)
    P_D5   = (nx + 40*sc, ny + 26*sc)
    P_D6   = (nx + 47*sc, ny + 0*sc)

    def wire(a, b, color=WHITE, w=1.0, mid=None):
        if mid:
            p.line(a[0], a[1], mid[0], mid[1], w, color)
            p.line(mid[0], mid[1], b[0], b[1], w, color)
        else:
            p.line(a[0], a[1], b[0], b[1], w, color)
        p.circle(a[0], a[1], 1.1, 0.6, color, fill=color)
        p.circle(b[0], b[1], 1.1, 0.6, color, fill=color)

    # HC-SR04 pines (abajo del sensor): Vcc,Tg,Ec,Gnd en x=13.5,19.5,25.5,31.5 local
    hx, hy = W*0.14, H*0.74
    H_VCC = (hx + 13.5*sc, hy - 6.2*sc)
    H_TRG = (hx + 19.5*sc, hy - 6.2*sc)
    H_ECH = (hx + 25.5*sc, hy - 6.2*sc)
    H_GND = (hx + 31.5*sc, hy - 6.2*sc)

    # Trig (amarillo->blanco) y Echo con divisor
    wire(H_TRG, P_TRIG, WHITE, 1.0, mid=(H_TRG[0], P_TRIG[1]+20))
    # divisor de voltaje en ECHO
    dvx, dvy = (H_ECH[0]+P_ECHO[0])/2, (hy + ny)/2 + 18
    p.rect(dvx-13, dvy-9, 26, 18, 0.8, AMBER, r=1.5)
    p.text(dvx, dvy+11, "DIVISOR 5V→3.3V", 6, AMBER, "middle", font=BOLD)
    p.rect(dvx-9, dvy+1, 7, 3.2, 0.6, WHITE); p.text(dvx-5.5, dvy+1.9, "1kΩ", 4.6, WHITE, "middle")
    p.rect(dvx-9, dvy-5, 7, 3.2, 0.6, WHITE); p.text(dvx-5.5, dvy-4.1, "2kΩ", 4.6, WHITE, "middle")
    p.line(dvx-2, dvy+2.6, dvx+6, dvy+2.6, 0.8, WHITE)
    p.line(dvx+6, dvy+2.6, dvx+6, dvy-2.6, 0.8, WHITE)
    p.text(dvx+8, dvy-1, "→ 3.33V ✓", 5, THIN)
    wire(H_ECH, (dvx-9, dvy+2.6), THIN, 0.9)
    wire((dvx+6, dvy+1), P_ECHO, WHITE, 0.9)

    # FC-28 -> A0  (ruta en L: sube y luego entra al borde izq. del NodeMCU)
    fx, fy = W*0.11, H*0.30
    A_pin = (fx + 49*sc, fy + 8*sc)
    wire(A_pin, P_A0, WATER, 0.9, mid=(A_pin[0], P_A0[1]))
    p.text(A_pin[0] + 4, (A_pin[1] + P_A0[1]) / 2, "A0 · humedad", 5.5, WATER)

    # Relé IN1 <- D5
    rx, ry = W*0.66, H*0.62
    R_IN = (rx + 4*sc, ry + 1.5*sc)
    wire(P_D5, R_IN, WHITE, 1.0, mid=((P_D5[0]+R_IN[0])/2, P_D5[1]+14))
    p.text((P_D5[0]+R_IN[0])/2, P_D5[1]+16, "D5 → IN1", 5.5, WHITE, "middle")

    # E-STOP -> D6 / GND
    ex, ey = W*0.17, H*0.50
    wire((ex+11*sc, ey), P_D6, WHITE, 0.9, mid=(P_D6[0], ey))
    p.text((ex+P_D6[0])/2, ey-7, "E-STOP → D6 (pull-up int.)", 5, WHITE, "middle")

    # Alimentación: Fuente 12V -> Relé(NO/COM) -> Bomba
    px, py = W*0.45, H*0.16
    pmx, pmy = W*0.70, H*0.26
    F_POS = (px + 39*sc, py + 5*sc)
    F_NEG = (px + 39*sc, py + 12*sc)
    R_NO  = (rx + 6*sc, ry + 38*sc)      # bornera superior relé canal 1
    B_POS = (pmx + 42*sc, pmy + 19*sc)
    B_NEG = (pmx + 42*sc, pmy + 7*sc)
    # 12V+ a NO1
    wire(F_POS, R_NO, AMBER, 1.4, mid=(R_NO[0], F_POS[1]))
    p.text((F_POS[0]+R_NO[0])/2, F_POS[1]+3, "12V + → NO₁", 5.5, AMBER, "middle")
    # COM1 a bomba +  (etiqueta en zona abierta entre relé y bomba)
    R_COM = (rx + 8.5*sc, ry + 38*sc)
    wire(R_COM, B_POS, AMBER, 1.4, mid=(B_POS[0], R_COM[1]))
    p.text(W*0.745, H*0.47, "COM₁ → Bomba (+)", 6, AMBER, "middle")
    # bomba - a 12V-
    wire(B_NEG, F_NEG, THIN, 1.2, mid=(B_NEG[0]+10, py + 12*sc))

    # leyenda
    lx, ly = m + 8, m + 44
    section_label(p, lx, ly + 30, "LEYENDA")
    items = [
        (WHITE, "Señal digital / control (3.3–5V)"),
        (WATER, "Señal analógica (A0 humedad)"),
        (AMBER, "Potencia 12V DC (bomba)"),
        (THIN,  "Retorno común / GND"),
    ]
    for i, (col, txt) in enumerate(items):
        yy = ly + 22 - i*7
        p.line(lx, yy, lx + 14, yy, 1.4, col)
        p.text(lx + 18, yy - 2, txt, 7, WHITE)

    c.save()


def p_at(p, x, y):
    """Devuelve un wrapper que empuja origen en (x,y) una vez y se auto-popea
    cuando el componente termina (los componentes hacen push/pop propios)."""
    # truco simple: trasladamos con un push base scale=1, los comp. hacen su push(scale)
    class _W:
        def __init__(self, pen, ox, oy):
            self.pen = pen; self.ox = ox; self.oy = oy
        def push(self, ox, oy, scale=1.0):
            self.pen.push(self.ox + ox, self.oy + oy, scale)
        def __getattr__(self, n):
            return getattr(self.pen, n)
    return _W(p, x, y)


# ================================================================ PLANO 2
def plano_soporte():
    c, p, W, H, m = new_page("02_Soporte_Sensor.pdf", "Soporte sensor")
    title_block(p, W, H, m, "02/04", "SOPORTE DEL SENSOR")
    p.text(m + 6, H - m - 14, "SOPORTE DEL SENSOR ULTRASÓNICO", 16, WHITE, font=BOLD)
    p.text(m + 6, H - m - 24, "Pieza impresa en 3D ya existente — base verde + cuna + clamp + HC-SR04", 8, THIN)

    # --- VISTA ISOMÉTRICA (pictórica, según foto) ---
    section_label(p, W*0.10, H*0.78, "VISTA ISOMÉTRICA")
    p.push(W*0.10, H*0.40, MM*1.6)
    # base de montaje (bloque verde)
    p.poly([(0,0),(34,-8),(34,22),(0,30)], 1.0, WHITE)
    p.poly([(0,30),(8,34),(42,26),(34,22)], 1.0, WHITE)
    p.poly([(34,22),(42,26),(42,-4),(34,-8)], 1.0, WHITE)
    p.circle(12, 16, 2.4, 0.7, THIN); p.circle(22, 12, 2.4, 0.7, THIN)  # tornillos base
    # cuna (cuerpo beige) cilíndrica
    p.arc(34, -6, 78, 30, 90, 180, 1.0, WHITE)
    p.poly([(56,30),(56,-6)], 1.0, WHITE, close=False)
    p.poly([(34,30),(56,30)], 1.0, WHITE, close=False)
    p.poly([(34,-6),(56,-6)], 1.0, WHITE, close=False)
    # cara frontal (disco morado = respaldo sensor)
    p.circle(45, 12, 12, 1.0, WHITE)
    p.circle(45, 12, 9.5, 0.5, THIN)
    # clamp blanco (palanca)
    p.poly([(52,-2),(60,-6),(64,2),(58,6)], 0.9, WHITE)
    p.leader(45, 24, 38, 42, "cuna / housing (beige)", 7, WHITE)
    p.leader(10, 20, 6, 40, "base (verde)", 7, WHITE, "start")
    p.leader(60, 2, 70, -6, "clamp de cierre", 7, WHITE)
    p.pop()

    # --- VISTA FRONTAL acotada ---
    section_label(p, W*0.42, H*0.80, "VISTA FRONTAL")
    p.push(W*0.42, H*0.45, MM*1.7)
    p.rect(0, 0, 40, 34, 1.0, WHITE, r=2)              # contorno cuna
    p.circle(20, 17, 13, 1.0, WHITE)                   # boca circular
    p.circle(20, 17, 10.5, 0.5, THIN)
    p.hole(6, 28, 1.6); p.hole(34, 28, 1.6)            # agujeros sup.
    p.dim_h(0, 40, -6, "Ø ext. 40", color=THIN)
    p.dim_v(0, 34, -7, "alto 34", color=THIN)
    p.dim_h(7, 33, 40, "Ø boca 26", color=THIN, above=True)
    p.pop()

    # --- VISTA LATERAL acotada ---
    section_label(p, W*0.66, H*0.80, "VISTA LATERAL (corte)")
    p.push(W*0.66, H*0.45, MM*1.7)
    # base
    p.rect(0, 4, 14, 26, 1.0, WHITE, r=1)
    for hy in range(7, 30, 4):
        p.line(0, hy, 14, hy, 0.25, THIN)
    p.circle(7, 12, 2, 0.6, THIN, dash=[2,1.5]); p.circle(7, 22, 2, 0.6, THIN, dash=[2,1.5])
    # cuna
    p.rect(14, 0, 30, 34, 1.0, WHITE, r=2)
    p.line(20, 0, 20, 34, 0.4, THIN, dash=[3,2])      # alojamiento sensor
    p.rect(20, 6, 18, 22, 0.7, THIN)                  # hueco HC-SR04
    p.text(29, 15, "HC-SR04", 5, THIN, "middle")
    p.dim_h(0, 14, -6, "base 14", color=THIN)
    p.dim_h(14, 44, -6, "prof. 30", color=THIN)
    p.dim_v(0, 34, 50, "34", color=THIN)
    p.pop()

    # nota de dimensiones
    nx, ny = m + 8, m + 40
    section_label(p, nx, ny + 24, "NOTAS")
    notes = [
        "• Pieza ya impresa en 3D (no rediseñar).",
        "• Material sugerido: PLA / PETG.",
        "• El HC-SR04 entra a presión en la cuna.",
        "• Cotas aproximadas tomadas del modelo CAD.",
    ]
    for i, t in enumerate(notes):
        p.text(nx, ny + 16 - i*6, t, 7, WHITE)

    # mini detalle del sensor (zona central libre, lejos del cajetín)
    section_label(p, W*0.30, H*0.27, "SENSOR HC-SR04 (referencia)")
    comp_hcsr04(p_at(p, W*0.30, H*0.10), MM*1.5)
    c.save()


# ================================================================ PLANO 3
def plano_caja():
    c, p, W, H, m = new_page("03_Caja_Control.pdf", "Caja de control")
    title_block(p, W, H, m, "03/04", "CAJA DE CONTROL")
    p.text(m + 6, H - m - 14, "CAJA DE CONTROL", 16, WHITE, font=BOLD)
    p.text(m + 6, H - m - 24, "Aloja ESP8266, relé y fuente — con prensaestopas para cables", 8, THIN)

    # VISTA FRONTAL (tapa)
    section_label(p, W*0.10, H*0.80, "TAPA FRONTAL")
    p.push(W*0.10, H*0.42, MM*1.45)
    p.rect(0, 0, 100, 70, 1.2, WHITE, r=4)
    for cx, cy in [(5,5),(95,5),(5,65),(95,65)]:
        p.hole(cx, cy, 2)
    comp_estop(p_at(p, 0, 0), 1.0) if False else None
    p.circle(28, 45, 9, 1.0, WHITE); p.circle(28, 45, 6, 0.5, THIN)   # E-STOP
    p.text(28, 31, "PARO", 6, WHITE, "middle", font=BOLD)
    p.circle(60, 50, 3, 0.8, WHITE); p.text(60, 41, "LED", 5, THIN, "middle")  # LED
    p.rect(72, 20, 16, 8, 0.8, WHITE); p.text(80, 13, "USB", 5, THIN, "middle") # ventana USB
    p.rect(20, 8, 60, 10, 0.5, THIN, dash=[3,2]); p.text(50, 11, "AquaGuard", 6, THIN, "middle")
    p.dim_h(0, 100, -7, "200", color=THIN)
    p.dim_v(0, 70, -7, "150", color=THIN)
    p.pop()

    # VISTA LATERAL con prensaestopas
    section_label(p, W*0.48, H*0.80, "LATERAL — SALIDA DE CABLES")
    p.push(W*0.48, H*0.45, MM*1.45)
    p.rect(0, 0, 100, 55, 1.2, WHITE, r=3)
    p.dim_v(0, 55, -7, "alto 100", color=THIN)
    p.dim_h(0, 100, -7, "200", color=THIN)
    glands = [
        (16, "12V DC (fuente)"),
        (38, "Sensor ultrasónico"),
        (60, "Sensor humedad"),
        (82, "Bomba 12V"),
    ]
    for gx, lab in glands:
        # prensaestopas
        p.circle(gx, 0, 3.5, 0.9, WHITE)
        p.circle(gx, 0, 2.0, 0.5, THIN)
        p.line(gx-3.5, -3, gx+3.5, -3, 0.8, WHITE)
        p.line(gx, -3, gx, -8, 1.0, WHITE)             # cable saliendo
        p.text(gx, -11, lab, 5, THIN, "middle")
    p.pop()

    # despiece interno (componentes a escala absoluta, sin solaparse)
    section_label(p, W*0.10, H*0.27, "DISPOSICIÓN INTERNA")
    ix, iy = W*0.10, H*0.09
    p.rect(ix - 8, iy - 8, 470, 100, 0.8, THIN, r=4)
    p.text(ix - 4, iy + 86, "interior de la caja (vista en planta)", 6.5, THIN)
    comp_nodemcu(p_at(p, ix + 6,   iy + 18), MM*0.80)
    comp_relay(  p_at(p, ix + 165, iy + 14), MM*0.62)
    comp_power(  p_at(p, ix + 350, iy + 30), MM*1.05)

    # tabla de prensaestopas (a la derecha, zona libre)
    tx, ty = W*0.72, H*0.30
    section_label(p, tx, ty + 6, "PRENSAESTOPAS")
    rows = [
        "PG7  →  sensores (señal)",
        "PG9  →  12V entrada (fuente)",
        "PG9  →  bomba 12V (potencia)",
        "Ø interior cable: 6–10 mm",
    ]
    for i, r in enumerate(rows):
        p.text(tx, ty - 4 - i*7, "•  " + r, 7.5, WHITE)

    c.save()


# ================================================================ PLANO 4
def plano_montaje():
    c, p, W, H, m = new_page("04_Montaje_Completo.pdf", "Montaje completo")
    title_block(p, W, H, m, "04/04", "MONTAJE COMPLETO — DEMO 2–3 L")
    p.text(m + 6, H - m - 14, "MONTAJE COMPLETO DEL SISTEMA", 16, WHITE, font=BOLD)
    p.text(m + 6, H - m - 24, "Tanque demo 2–3 L, soporte+sensor, bomba, mangueras y caja de control", 8, THIN)

    base_y = H*0.20
    # ---- TANQUE demo ----
    tx = W*0.30
    tw, th = 150, 200
    p.push(tx, base_y, 1.0)
    # cuerpo del tanque (recipiente)
    p.poly([(0,0),(tw,0),(tw-8,th),(8,th)], 1.2, WHITE)
    # nivel de agua
    wl = th*0.55
    p.line(6, wl, tw-6, wl, 0.8, WATER)
    for xx in range(12, int(tw)-10, 14):                # ondas
        p.arc(xx-4, wl-2, xx+4, wl+2, 0, 180, 0.5, WATER)
    p.text(tw/2, wl-12, "agua  ~2–3 L", 7, WATER, "middle")
    # tapa con soporte + sensor
    p.rect(tw*0.30, th, tw*0.40, 10, 1.0, WHITE)        # soporte sobre tapa
    comp_hcsr04(p_at(p, tw*0.30+4, th+12), MM*0.9)
    # cono ultrasónico hacia el agua
    p.line(tw*0.5-10, th+12, tw*0.5-24, wl, 0.4, THIN, dash=[3,2])
    p.line(tw*0.5+10, th+12, tw*0.5+24, wl, 0.4, THIN, dash=[3,2])
    p.text(tw*0.5+27, (th+wl)/2+3, "medición", 5, THIN)
    p.text(tw*0.5+27, (th+wl)/2-3, "de nivel", 5, THIN)
    # cotas tanque
    p.dim_v(0, th, -8, "alto ~20 cm", color=THIN)
    p.dim_h(0, tw, -8, "Ø ~10–12 cm", color=THIN)
    p.pop()

    # ---- BOMBA + mangueras ----
    bx, by = W*0.62, base_y + 10
    comp_pump(p_at(p, bx, by), MM*1.3)
    # manguera de llenado: bomba -> tanque (entra por arriba)
    p.line(bx, by+24, bx, base_y+220, 1.2, WATER)
    p.line(bx, base_y+220, tx+150*0.5, base_y+220, 1.2, WATER)
    p.line(tx+150*0.5, base_y+220, tx+150*0.5, base_y+200+10, 1.2, WATER)
    p.text(bx+6, base_y+224, "manguera de llenado", 6, WATER)
    # cisterna / fuente de agua bajo la bomba
    p.push(bx-6, base_y-46, 1.0)
    p.rect(0, 0, 70, 34, 1.0, THIN)
    p.line(4, 22, 66, 22, 0.6, WATER)
    p.text(35, 10, "cisterna / fuente", 6, THIN, "middle")
    p.pop()
    p.line(bx+6, by, bx+6, base_y-12, 1.0, WATER)       # succión
    p.text(bx+9, base_y-8, "succión", 5, WATER)

    # ---- CAJA DE CONTROL ----
    cx, cy = W*0.80, base_y + 70
    p.push(cx, cy, MM*1.1)
    p.rect(0, 0, 64, 46, 1.2, WHITE, r=3)
    p.circle(16, 32, 6, 0.9, WHITE); p.text(16, 22, "PARO", 5, WHITE, "middle")
    p.circle(40, 34, 2.5, 0.7, WHITE)
    p.text(32, 40, "CAJA DE CONTROL", 5.5, WHITE, "middle", font=BOLD)
    p.text(32, 6, "ESP8266 · relé · fuente", 5, THIN, "middle")
    p.pop()
    # cableado caja -> sensor / bomba (esquemático)
    p.line(cx, cy+20, tx+150*0.5, base_y+200+22, 0.7, WHITE, dash=[4,3])
    p.text((cx+tx+75)/2, base_y+232, "señal sensor", 5, THIN, "middle")
    p.line(cx, cy+6, bx+30, by+10, 0.7, AMBER, dash=[4,3])
    p.text((cx+bx)/2, (cy+by)/2-4, "12V bomba (relé)", 5, AMBER, "middle")
    # WiFi
    p.arc(cx+50, cy+38, cx+70, cy+58, 200, 80, 0.6, THIN)
    p.arc(cx+54, cy+42, cx+66, cy+54, 200, 80, 0.6, THIN)
    p.text(cx+74, cy+50, "WiFi → App", 6, THIN)

    # leyenda de flujo
    lx, ly = m + 8, m + 40
    section_label(p, lx, ly + 22, "REFERENCIAS")
    refs = [
        (WATER, "Agua / mangueras"),
        (AMBER, "Potencia 12V a la bomba"),
        (WHITE, "Señal de sensores / control"),
    ]
    for i, (col, t) in enumerate(refs):
        yy = ly + 14 - i*7
        p.line(lx, yy, lx+14, yy, 1.4, col)
        p.text(lx+18, yy-2, t, 7, WHITE)

    c.save()


if __name__ == "__main__":
    plano_circuito()
    plano_soporte()
    plano_caja()
    plano_montaje()
    print("OK ->", OUT)
    for f in sorted(os.listdir(OUT)):
        print("  ", f)
