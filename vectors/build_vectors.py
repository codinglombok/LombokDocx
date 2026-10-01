#!/usr/bin/env python3
"""Builds vectors/lombokdocx-vectors-v1.json (GP-11).

Oracles are independent of the TypeScript implementation:
  * inflate / zip cases: compressed data and archives are produced by Python's
    zlib and zipfile; expected bytes are the original input (size + SHA-256);
  * xml / docx cases: expected trees, blocks, text and HTML are written by hand
    from SPEC_LombokDocx.

Compressed bytes depend on the zlib build, so CI does not regenerate this file;
it checks vectors/SHA256SUMS instead. After editing, run:

    python3 vectors/build_vectors.py
    sha256sum vectors/lombokdocx-vectors-v1.json > vectors/SHA256SUMS

and update the hash in docs/SPEC_LombokDocx_v<version>.md.
"""
import base64
import hashlib
import io
import json
import pathlib
import random
import struct
import zipfile
import zlib

cases = []


def add(fn, expected, **fields):
    n = sum(1 for c in cases if c["fn"] == fn) + 1
    case = {"id": f"{fn}-{n:03d}", "fn": fn}
    case.update(fields)
    case["expected"] = expected
    cases.append(case)


def b64(b):
    return base64.b64encode(b).decode()


def digest(b):
    return {"size": len(b), "sha256": hashlib.sha256(b).hexdigest()}


def deflate_raw(data, level=6, strategy=zlib.Z_DEFAULT_STRATEGY):
    c = zlib.compressobj(level, zlib.DEFLATED, -15, 9, strategy)
    return c.compress(data) + c.flush()


rng = random.Random(20261001)

# --- §2.1 inflate(input_b64) -> {size, sha256} -----------------------------
samples = [
    b"",
    b"a",
    b"hello, world",
    b"abcabcabcabcabcabcabcabcabcabcabcabcabcabcabc",
    b"\x00" * 1000,
    bytes(range(256)) * 4,
    "Teks Unicode: é ü ñ 日本語 😀".encode(),
    b"The quick brown fox jumps over the lazy dog. " * 50,
    bytes(rng.getrandbits(8) for _ in range(3000)),
    bytes(rng.choice(b"ACGT") for _ in range(5000)),
    b"x" * 258 + b"y" * 259 + b"z" * 3,
    b"ab" * 40000,
]
for data in samples:
    add("inflate", digest(data), input=b64(deflate_raw(data)))
for level in (0, 1, 9):
    data = b"level test " * 300 + bytes(range(200))
    add("inflate", digest(data), input=b64(deflate_raw(data, level)), note=f"level {level}")
for strategy, name in ((zlib.Z_FIXED, "fixed Huffman"), (zlib.Z_HUFFMAN_ONLY, "Huffman only"), (zlib.Z_RLE, "RLE")):
    data = b"strategy " * 100 + bytes(rng.getrandbits(8) for _ in range(500))
    add("inflate", digest(data), input=b64(deflate_raw(data, 6, strategy)), note=name)
# hand-built blocks
add("inflate", digest(b"hello"), input=b64(b"\x01\x05\x00\xfa\xffhello"), note="single stored block")
add("inflate", digest(b"ab"), input=b64(b"\x00\x01\x00\xfe\xffa\x01\x01\x00\xfe\xffb"), note="two stored blocks")
add("inflate", digest(b""), input=b64(b"\x03\x00"), note="empty fixed block")
good = deflate_raw(b"some data that will be truncated " * 20)
add("inflate", {"error": "CORRUPT_DATA"}, input=b64(good[: len(good) // 2]), note="truncated stream")
add("inflate", {"error": "CORRUPT_DATA"}, input=b64(b"\x07"), note="reserved block type 3")
add("inflate", {"error": "CORRUPT_DATA"}, input=b64(b"\x01\x05\x00\x00\x00hello"), note="LEN/NLEN mismatch")
add("inflate", {"error": "CORRUPT_DATA"}, input=b64(b""), note="empty input")
add("inflate", {"error": "CORRUPT_DATA"}, input=b64(bytes([0x63, 0x00, 0x02])), note="distance too far back")
def fixed_block(symbols):
    """Hand-assembles one final fixed-Huffman block (RFC 1951 3.2.6)."""
    bits = [1, 1, 0]  # BFINAL=1, BTYPE=01 (LSB first)
    def code(value, length):
        bits.extend((value >> (length - 1 - k)) & 1 for k in range(length))
    def extra(value, length):
        bits.extend((value >> k) & 1 for k in range(length))
    for kind, *a in symbols:
        if kind == "lit":
            v = a[0]
            code(0x30 + v, 8) if v < 144 else code(0x190 + v - 144, 9)
        elif kind == "copy":  # length 3 (symbol 257), distance code d (5 bits, no extra for d<4)
            code(1, 7)
            code(a[0], 5)
    code(0, 7)  # end of block (256)
    while len(bits) % 8:
        bits.append(0)
    return bytes(sum(bits[i + k] << k for k in range(8)) for i in range(0, len(bits), 8))


for syms, note in (([("lit", 97), ("copy", 0)], "hand-built fixed block, distance 1"),
                   ([("lit", 97), ("lit", 98), ("copy", 1)], "hand-built fixed block, distance 2")):
    blk = fixed_block(syms)
    add("inflate", digest(zlib.decompress(blk, -15)), input=b64(blk), note=note)
add("inflate", {"error": "CORRUPT_DATA"}, input=b64(fixed_block([("lit", 97), ("copy", 1)])),
    note="distance 2 with one byte of history")
add("inflate", {"error": "LIMIT_EXCEEDED"}, input=b64(deflate_raw(b"\x00" * 5000)), maxSize=4096, note="output limit")


# --- §2.2 zip(input_b64) -> {entries, read} ---------------------------------
def make_zip(files, method=zipfile.ZIP_DEFLATED, **kw):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", method, **kw) as z:
        for name, data in files:
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = method
            z.writestr(info, data)
    return buf.getvalue()


z_files = [("a.txt", b"alpha"), ("dir/b.bin", bytes(range(256))), ("empty", b"")]
add("zip", {"entries": ["a.txt", "dir/b.bin", "empty"], "read": {n: digest(d) for n, d in z_files}},
    input=b64(make_zip(z_files)))
add("zip", {"entries": ["a.txt", "dir/b.bin", "empty"], "read": {n: digest(d) for n, d in z_files}},
    input=b64(make_zip(z_files, zipfile.ZIP_STORED)), note="stored")
big = b"Lombok " * 20000
add("zip", {"entries": ["big.txt"], "read": {"big.txt": digest(big)}}, input=b64(make_zip([("big.txt", big)])))
uni = [("ñame/日本.xml", "<a>é</a>".encode())]
add("zip", {"entries": ["ñame/日本.xml"], "read": {"ñame/日本.xml": digest(uni[0][1])}}, input=b64(make_zip(uni)))
add("zip", {"entries": ["x"], "read": {"x": digest(b"1"), "missing": None}}, input=b64(make_zip([("x", b"1")])))
buf = io.BytesIO()
with zipfile.ZipFile(buf, "w") as z:
    z.comment = b"archive comment"
    z.writestr(zipfile.ZipInfo("c.txt", (2026, 1, 1, 0, 0, 0)), b"commented")
add("zip", {"entries": ["c.txt"], "read": {"c.txt": digest(b"commented")}}, input=b64(buf.getvalue()), note="EOCD comment")
buf = io.BytesIO()
with zipfile.ZipFile(buf, "w") as z:
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        z.writestr(zipfile.ZipInfo("d", (2026, 1, 1, 0, 0, 0)), b"first")
        z.writestr(zipfile.ZipInfo("d", (2026, 1, 1, 0, 0, 0)), b"second")
add("zip", {"entries": ["d", "d"], "read": {"d": digest(b"first")}}, input=b64(buf.getvalue()), note="duplicate name: first wins")
add("zip", {"error": "INVALID_ZIP"}, input=b64(b"not a zip file at all, just text"), call="open")
add("zip", {"error": "INVALID_ZIP"}, input=b64(b"PK"), call="open")
z1 = bytearray(make_zip([("a", b"payload data")], zipfile.ZIP_STORED))
z1[30 + 1 + 3] ^= 0xFF  # flip a data byte -> CRC mismatch
add("zip", {"error": "CORRUPT_DATA"}, input=b64(bytes(z1)), call="read", name="a")
z2 = bytearray(make_zip([("a", b"payload")], zipfile.ZIP_STORED))
cd = z2.rfind(b"PK\x01\x02")
z2[cd + 8] |= 1
z2[6] |= 1
add("zip", {"error": "UNSUPPORTED_ZIP"}, input=b64(bytes(z2)), call="read", name="a", note="encryption flag")
z3 = bytearray(make_zip([("a", b"payload")], zipfile.ZIP_STORED))
cd = z3.rfind(b"PK\x01\x02")
z3[cd + 10] = 12  # bzip2
z3[8] = 12
add("zip", {"error": "UNSUPPORTED_ZIP"}, input=b64(bytes(z3)), call="read", name="a", note="method 12")
buf = io.BytesIO()
with zipfile.ZipFile(buf, "w", allowZip64=True) as z:
    z.writestr(zipfile.ZipInfo("a", (2026, 1, 1, 0, 0, 0)), b"x")
z64 = bytearray(buf.getvalue())
e = z64.rfind(b"PK\x05\x06")
z64[e + 16:e + 20] = b"\xff\xff\xff\xff"
add("zip", {"error": "UNSUPPORTED_ZIP"}, input=b64(bytes(z64)), call="open", note="ZIP64 marker")
add("zip", {"error": "LIMIT_EXCEEDED"}, input=b64(make_zip([("bomb", b"\x00" * 200000)])), call="read", name="bomb",
    limits={"maxEntrySize": 100000})
add("zip", {"error": "LIMIT_EXCEEDED"}, input=b64(make_zip([("a", b"1"), ("b", b"2"), ("c", b"3")])), call="open",
    limits={"maxEntries": 2})
add("zip", {"error": "LIMIT_EXCEEDED"}, input=b64(make_zip([("a", b"x" * 600), ("b", b"y" * 600)])), call="read",
    name="b", limits={"maxTotalSize": 1000}, readFirst="a")
z4 = bytearray(make_zip([("a", b"declared size lies")], zipfile.ZIP_DEFLATED))
cd = z4.rfind(b"PK\x01\x02")
struct.pack_into("<I", z4, cd + 24, 5)
add("zip", {"error": "CORRUPT_DATA"}, input=b64(bytes(z4)), call="read", name="a", note="size field too small")


# --- §3 xml(input) -> element tree -----------------------------------------
def E(name, attrs=None, *children):
    return {"name": name, "attributes": attrs or {}, "children": list(children)}


X = "xml"
add(X, E("a"), input="<a/>")
add(X, E("a"), input="<a></a>")
add(X, E("a", {}, "text"), input="<a>text</a>")
add(X, E("root", {}, E("child", {}, "Text")), input="<root><child>Text</child></root>")
add(X, E("div", {"id": "test", "class": "c"}, "Content"), input='<div id="test" class="c">Content</div>')
add(X, E("a", {"x": "1", "y": "2"}), input="<a x='1' y = \"2\" />")
add(X, E("a", {}, "<&>\"'"), input="<a>&lt;&amp;&gt;&quot;&apos;</a>")
add(X, E("a", {}, "AéA😀"), input="<a>&#65;&#xe9;&#x41;&#128512;</a>")
add(X, E("a", {"v": "a b c"}), input='<a v="a\tb\nc"/>')
add(X, E("a", {"v": "a\tb"}), input='<a v="a&#9;b"/>')
add(X, E("a", {}, "x\ny\nz"), input="<a>x\r\ny\rz</a>")
add(X, E("a", {}, "<b>raw</b> & more"), input="<a><![CDATA[<b>raw</b>]]> &amp; more</a>")
add(X, E("a", {}, "one", E("b"), "two"), input="<a>one<!-- c --><b/>two</a>")
add(X, E("a", {}, "  "), input="<a>  </a>")
add(X, E("w:p", {"w:rsidR": "00A1"}, E("w:r", {}, E("w:t", {"xml:space": "preserve"}, " x "))),
    input='<w:p w:rsidR="00A1"><w:r><w:t xml:space="preserve"> x </w:t></w:r></w:p>')
add(X, E("a"), input='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<a/>\n')
add(X, E("a"), input="﻿<a/>")
add(X, E("a", {}, E("b", {}, E("c", {}, E("d")))), input="<a><b><c><d/></c></b></a>")
add(X, E("a", {}, "x > y"), input="<a>x > y</a>")
for bad, note in [
    ("<a>", "unclosed"),
    ("<a></b>", "mismatched"),
    ("<a/><b/>", "two roots"),
    ("text<a/>", "text before root"),
    ("", "empty"),
    ('<!DOCTYPE a [<!ENTITY e "x">]><a>&e;</a>', "DTD rejected"),
    ("<a>&e;</a>", "undefined entity"),
    ("<a>&#0;</a>", "invalid char ref"),
    ('<a x="1" x="2"/>', "duplicate attribute"),
    ("<a x=1/>", "unquoted attribute"),
    ('<a x="<"/>', "< in attribute"),
    ("<a>]]></a>", "]]> in text"),
    ("<a><!-- open</a>", "unterminated comment"),
    ("<a>&amp</a>", "unterminated reference"),
]:
    add(X, {"error": "INVALID_XML"}, input=bad, note=note)
add(X, {"error": "LIMIT_EXCEEDED"}, input="<a>" * 5 + "</a>" * 5, maxDepth=4, note="depth limit")
add(X, E("a", {}, E("a", {}, E("a", {}, E("a")))), input="<a><a><a><a/></a></a></a>", maxDepth=3, note="self-closing at limit")

# --- §4-§6 docx(input_b64) -> {blocks, images, metadata, text, html} --------
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
RNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG = "http://schemas.openxmlformats.org/package/2006/relationships"
DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'


def rels(items):
    body = "".join(
        f'<Relationship Id="{i}" Type="{RNS}/{t}" Target="{tg}"' + (' TargetMode="External"' if ext else "") + "/>"
        for i, t, tg, ext in items
    )
    return f'{DECL}<Relationships xmlns="{PKG}">{body}</Relationships>'


def package(body, styles=None, numbering=None, doc_rels=(), core=None, app=None, media=None, main="word/document.xml",
            doc_xml=None, prefix="w"):
    files = []
    pkg = [("rId1", "officeDocument", main, False)]
    if core is not None:
        pkg.append(("rId2", "metadata/core-properties", "docProps/core.xml", False))
    if app is not None:
        pkg.append(("rId3", "extended-properties", "docProps/app.xml", False))
    p = rels(pkg).replace(f'{RNS}/metadata/core-properties', "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties")
    files.append(("_rels/.rels", p))
    xml = doc_xml or (f'{DECL}<{prefix}:document xmlns:{prefix}="{W}" xmlns:r="{RNS}" '
                      'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
                      f'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">'
                      f'<{prefix}:body>{body}</{prefix}:body></{prefix}:document>')
    files.append((main, xml))
    items = list(doc_rels)
    if styles is not None:
        items.append(("rIdS", "styles", "styles.xml", False))
        files.append(("word/styles.xml", f'{DECL}<w:styles xmlns:w="{W}">{styles}</w:styles>'))
    if numbering is not None:
        items.append(("rIdN", "numbering", "numbering.xml", False))
        files.append(("word/numbering.xml", f'{DECL}<w:numbering xmlns:w="{W}">{numbering}</w:numbering>'))
    if items:
        d = main.rsplit("/", 1)
        files.append((f"{d[0]}/_rels/{d[1]}.rels", rels(items)))
    if core is not None:
        files.append(("docProps/core.xml", f'{DECL}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
                      'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">' + core + '</cp:coreProperties>'))
    if app is not None:
        files.append(("docProps/app.xml", f'{DECL}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">{app}</Properties>'))
    for name, data in (media or {}).items():
        files.append((name, data))
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in files:
            z.writestr(zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0)), data)
    return buf.getvalue()


def R(text, **kw):
    r = {"text": text}
    r.update(kw)
    return r


def P(text, runs=None, **kw):
    p = {"text": text, "runs": runs if runs is not None else ([R(text)] if text else [])}
    p.update(kw)
    return {"type": "paragraph", "paragraph": p}


def para(text, runs=None, **kw):
    return P(text, runs, **kw)["paragraph"]


def T(rows, **kw):
    t = {"rows": [{"cells": cells} for cells in rows]}
    t.update(kw)
    return {"type": "table", "table": t}


def C(text, paragraphs=None, **kw):
    c = {"text": text, "paragraphs": paragraphs if paragraphs is not None else [para(t) for t in text.split("\n")]}
    c.update(kw)
    return c


def D(body, blocks, text, html, images=None, metadata=None, options=None, note=None, **pkgkw):
    fields = {"input": b64(package(body, **pkgkw))}
    if note:
        fields["note"] = note
    if options:
        fields["options"] = options
    add("docx", {"blocks": blocks, "images": images or [], "metadata": metadata or {}, "text": text, "html": html}, **fields)


def wp(inner, ppr=""):
    return f"<w:p>{'<w:pPr>' + ppr + '</w:pPr>' if ppr else ''}{inner}</w:p>"


def wr(text, rpr=""):
    return f"<w:r>{'<w:rPr>' + rpr + '</w:rPr>' if rpr else ''}<w:t xml:space=\"preserve\">{text}</w:t></w:r>"


D("", [], "", "")
D(wp(wr("Hello")), [P("Hello")], "Hello", "<p>Hello</p>\n")
D(wp(""), [P("")], "", "<p></p>\n")
D(wp(wr("a")) + wp(wr("b")), [P("a"), P("b")], "a\nb", "<p>a</p>\n<p>b</p>\n")
D(wp(wr("Hel") + wr("lo")), [P("Hello")], "Hello", "<p>Hello</p>\n", note="adjacent runs merged")
D(wp(wr("a") + wr("b", "<w:b/>")), [P("ab", [R("a"), R("b", bold=True)])], "ab", "<p>a<strong>b</strong></p>\n")
D(wp(wr("x", '<w:b/><w:i/><w:u w:val="single"/><w:strike/><w:color w:val="ff0000"/><w:sz w:val="28"/>')),
  [P("x", [R("x", bold=True, italic=True, underline=True, strike=True, color="#FF0000", fontSize=14)])], "x",
  '<p><span style="color: #FF0000"><s><u><em><strong>x</strong></em></u></s></span></p>\n')
D(wp(wr("x", '<w:b w:val="0"/><w:i w:val="false"/><w:u w:val="none"/><w:color w:val="auto"/>')), [P("x")], "x",
  "<p>x</p>\n", note="explicit off values")
D(wp(wr("x", '<w:b w:val="1"/><w:i w:val="on"/>')), [P("x", [R("x", bold=True, italic=True)])], "x",
  "<p><em><strong>x</strong></em></p>\n")
D(wp(wr("x", '<w:dstrike/><w:sz w:val="21"/>')), [P("x", [R("x", strike=True, fontSize=10.5)])], "x", "<p><s>x</s></p>\n")
D(wp(wr("x", '<w:color w:val="12345"/><w:sz w:val="abc"/>')), [P("x")], "x", "<p>x</p>\n", note="invalid color and size ignored")
D(wp("<w:r><w:t>a</w:t><w:tab/><w:t>b</w:t><w:br/><w:t>c</w:t><w:cr/></w:r>"), [P("a\tb\nc\n")], "a\tb\nc\n",
  "<p>a\tb<br>c<br></p>\n")
D(wp("<w:r><w:t>non</w:t><w:noBreakHyphen/><w:t>break</w:t><w:softHyphen/></w:r>"), [P("non‑break­")],
  "non‑break­", "<p>non‑break­</p>\n")
D(wp(wr("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; 'q'")), [P("<script>alert(\"x\")</script> & 'q'")],
  "<script>alert(\"x\")</script> & 'q'", "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39;</p>\n")
D(wp("<w:r><w:t>keep</w:t><w:delText>gone</w:delText><w:instrText>PAGE</w:instrText></w:r>"), [P("keep")], "keep",
  "<p>keep</p>\n")
D(wp(wr("a") + "<w:del><w:r><w:delText>x</w:delText></w:r></w:del><w:ins>" + wr("b") + "</w:ins>"), [P("ab")], "ab",
  "<p>ab</p>\n", note="tracked changes: insertions kept, deletions dropped")
D(wp("<w:smartTag>" + wr("s") + "</w:smartTag><w:sdt><w:sdtContent>" + wr("d") + "</w:sdtContent></w:sdt>"
     + "<w:fldSimple w:instr=\"DATE\">" + wr("f") + "</w:fldSimple>"), [P("sdf")], "sdf", "<p>sdf</p>\n")
D(wp('<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> PAGE </w:instrText></w:r>'
     '<w:r><w:fldChar w:fldCharType="separate"/></w:r>' + wr("7") + '<w:r><w:fldChar w:fldCharType="end"/></w:r>'),
  [P("7")], "7", "<p>7</p>\n", note="complex field shows result")
D(wp(wr("Centre"), '<w:jc w:val="center"/>'), [P("Centre", formatting={"align": "center"})], "Centre",
  '<p style="text-align: center">Centre</p>\n')
D(wp(wr("R"), '<w:jc w:val="end"/>') + wp(wr("J"), '<w:jc w:val="both"/>') + wp(wr("L"), '<w:jc w:val="start"/>'),
  [P("R", formatting={"align": "right"}), P("J", formatting={"align": "justify"}), P("L", formatting={"align": "left"})],
  "R\nJ\nL", '<p style="text-align: right">R</p>\n<p style="text-align: justify">J</p>\n<p>L</p>\n')
D(wp(wr("x"), '<w:jc w:val="mystery"/>'), [P("x")], "x", "<p>x</p>\n")
D(wp(wr("Title"), '<w:pStyle w:val="Heading1"/>'), [P("Title", style="Heading1", heading=1)], "Title", "<h1>Title</h1>\n",
  note="heading from style id when there is no styles part")
D(wp(wr("Deep"), '<w:pStyle w:val="heading8"/>'), [P("Deep", style="heading8", heading=8)], "Deep", "<h6>Deep</h6>\n")
D(wp(wr("Judul"), '<w:pStyle w:val="Judul2"/>'), [P("Judul", style="Judul2", heading=2)], "Judul", "<h2>Judul</h2>\n",
  styles='<w:style w:type="paragraph" w:styleId="Judul2"><w:name w:val="heading 2"/></w:style>',
  note="localised style id, heading from style name")
D(wp(wr("NotH"), '<w:pStyle w:val="Heading1"/>'), [P("NotH", style="Heading1")], "NotH", "<p>NotH</p>\n",
  styles='<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Custom"/></w:style>',
  note="styles part present: style name decides")
D(wp(wr("q"), '<w:pStyle w:val="Quote"/>'), [P("q", style="Quote")], "q", "<p>q</p>\n")

NUM = ('<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl>'
       '<w:lvl w:ilvl="1"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum>'
       '<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum>'
       '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>')


def li(text, num, lvl=None):
    ilvl = f'<w:ilvl w:val="{lvl}"/>' if lvl is not None else ""
    return wp(wr(text), f'<w:numPr>{ilvl}<w:numId w:val="{num}"/></w:numPr>')


D(li("a", 1, 0) + li("b", 1, 0),
  [P("a", list={"numId": "1", "level": 0, "ordered": False}), P("b", list={"numId": "1", "level": 0, "ordered": False})],
  "a\nb", "<ul>\n<li>a</li>\n<li>b</li>\n</ul>\n", numbering=NUM)
D(li("one", 2) + li("two", 2),
  [P("one", list={"numId": "2", "level": 0, "ordered": True}), P("two", list={"numId": "2", "level": 0, "ordered": True})],
  "one\ntwo", "<ol>\n<li>one</li>\n<li>two</li>\n</ol>\n", numbering=NUM, note="ilvl absent means 0")
D(li("a", 1, 0) + li("a1", 1, 1) + li("a2", 1, 1) + li("b", 1, 0),
  [P("a", list={"numId": "1", "level": 0, "ordered": False}), P("a1", list={"numId": "1", "level": 1, "ordered": True}),
   P("a2", list={"numId": "1", "level": 1, "ordered": True}), P("b", list={"numId": "1", "level": 0, "ordered": False})],
  "a\na1\na2\nb", "<ul>\n<li>a<ol>\n<li>a1</li>\n<li>a2</li>\n</ol>\n</li>\n<li>b</li>\n</ul>\n", numbering=NUM)
D(li("a", 1, 0) + li("n", 2, 0),
  [P("a", list={"numId": "1", "level": 0, "ordered": False}), P("n", list={"numId": "2", "level": 0, "ordered": True})],
  "a\nn", "<ul>\n<li>a</li>\n</ul>\n<ol>\n<li>n</li>\n</ol>\n", numbering=NUM, note="type change at same level")
D(li("a", 1, 0) + wp(wr("mid")) + li("b", 1, 0),
  [P("a", list={"numId": "1", "level": 0, "ordered": False}), P("mid"), P("b", list={"numId": "1", "level": 0, "ordered": False})],
  "a\nmid\nb", "<ul>\n<li>a</li>\n</ul>\n<p>mid</p>\n<ul>\n<li>b</li>\n</ul>\n", numbering=NUM)
D(li("x", 1, 1) + li("y", 1, 0),
  [P("x", list={"numId": "1", "level": 1, "ordered": True}), P("y", list={"numId": "1", "level": 0, "ordered": False})],
  "x\ny", "<ol>\n<li><ol>\n<li>x</li>\n</ol>\n</li>\n</ol>\n<ul>\n<li>y</li>\n</ul>\n", numbering=NUM,
  note="start below level 0: intermediate list and item use the item tag")
D(li("n0", 3, 0), [P("n0", list={"numId": "3", "level": 0, "ordered": False})], "n0", "<ul>\n<li>n0</li>\n</ul>\n",
  numbering=NUM + '<w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:numFmt w:val="none"/></w:lvl></w:abstractNum>'
  '<w:num w:numId="3"><w:abstractNumId w:val="2"/></w:num>', note="numFmt none is not ordered")
D(li("z", 0), [P("z")], "z", "<p>z</p>\n", numbering=NUM, note="numId 0 removes numbering")
D(li("u", 9, 0), [P("u", list={"numId": "9", "level": 0, "ordered": False})], "u", "<ul>\n<li>u</li>\n</ul>\n",
  numbering=NUM, note="unknown numId is a bullet list")
D(li("v", 1, 12), [P("v", list={"numId": "1", "level": 0, "ordered": False})], "v", "<ul>\n<li>v</li>\n</ul>\n",
  numbering=NUM, note="invalid ilvl means 0")
D(wp(wr("s1"), '<w:pStyle w:val="ListBullet"/>'),
  [P("s1", style="ListBullet", list={"numId": "1", "level": 0, "ordered": False})], "s1", "<ul>\n<li>s1</li>\n</ul>\n",
  numbering=NUM, styles='<w:style w:type="paragraph" w:styleId="ListBase"><w:name w:val="List Base"/><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr></w:style>'
  '<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="ListBase"/></w:style>',
  note="numbering inherited through basedOn")


def tc(text, tcpr=""):
    return f"<w:tc>{'<w:tcPr>' + tcpr + '</w:tcPr>' if tcpr else ''}{wp(wr(text) if text else '')}</w:tc>"


def tr(*cells):
    return "<w:tr>" + "".join(cells) + "</w:tr>"


def tbl(*rows, tblpr=""):
    return f"<w:tbl>{'<w:tblPr>' + tblpr + '</w:tblPr>' if tblpr else ''}" + "".join(rows) + "</w:tbl>"


D(tbl(tr(tc("A"), tc("B")), tr(tc("C"), tc("D"))), [T([[C("A"), C("B")], [C("C"), C("D")]])], "A\tB\nC\tD",
  "<table>\n<tr>\n<td>A</td>\n<td>B</td>\n</tr>\n<tr>\n<td>C</td>\n<td>D</td>\n</tr>\n</table>\n")
D(tbl(tr(tc("wide", '<w:gridSpan w:val="2"/>')), tr(tc("a"), tc("b"))),
  [T([[C("wide", colSpan=2)], [C("a"), C("b")]])], "wide\na\tb",
  '<table>\n<tr>\n<td colspan="2">wide</td>\n</tr>\n<tr>\n<td>a</td>\n<td>b</td>\n</tr>\n</table>\n')
D(tbl(tr(tc("v", '<w:vMerge w:val="restart"/>'), tc("1")), tr(tc("", "<w:vMerge/>"), tc("2")),
      tr(tc("", '<w:vMerge w:val="continue"/>'), tc("3"))),
  [T([[C("v", rowSpan=3), C("1")], [C("2")], [C("3")]])], "v\t1\n2\n3",
  '<table>\n<tr>\n<td rowspan="3">v</td>\n<td>1</td>\n</tr>\n<tr>\n<td>2</td>\n</tr>\n<tr>\n<td>3</td>\n</tr>\n</table>\n')
D(tbl(tr(tc("v", '<w:vMerge w:val="restart"/>')), tr(tc("plain")), tr(tc("", "<w:vMerge/>"))),
  [T([[C("v")], [C("plain")], [C("")]])], "v\nplain\n", "<table>\n<tr>\n<td>v</td>\n</tr>\n<tr>\n<td>plain</td>\n</tr>\n<tr>\n<td></td>\n</tr>\n</table>\n",
  note="an ordinary cell ends the vertical merge")
D(tbl(tr(tc("x"), tc("y")), tr(tc("", "<w:vMerge/>"), tc("z"))), [T([[C("x"), C("y")], [C(""), C("z")]])], "x\ty\n\tz",
  "<table>\n<tr>\n<td>x</td>\n<td>y</td>\n</tr>\n<tr>\n<td></td>\n<td>z</td>\n</tr>\n</table>\n",
  note="continue without restart is an ordinary cell")
D(tbl(tr(tc("m", '<w:gridSpan w:val="2"/><w:vMerge w:val="restart"/>'), tc("r")),
      tr(tc("", '<w:gridSpan w:val="2"/><w:vMerge/>'), tc("s"))),
  [T([[C("m", colSpan=2, rowSpan=2), C("r")], [C("s")]])], "m\tr\ns",
  '<table>\n<tr>\n<td colspan="2" rowspan="2">m</td>\n<td>r</td>\n</tr>\n<tr>\n<td>s</td>\n</tr>\n</table>\n')
D(tbl(tr("<w:tc>" + wp(wr("p1")) + wp(wr("p2", "<w:b/>")) + "</w:tc>")),
  [T([[C("p1\np2", [para("p1"), para("p2", [R("p2", bold=True)])])]])], "p1\np2",
  "<table>\n<tr>\n<td>p1<br><strong>p2</strong></td>\n</tr>\n</table>\n")
inner = tbl(tr(tc("i1"), tc("i2")))
D(tbl(tr("<w:tc>" + wp(wr("out")) + inner + wp("") + "</w:tc>")),
  [T([[C("out\ni1\ti2\n", [para("out"), para("")], tables=[T([[C("i1"), C("i2")]])["table"]])]])], "out\ni1\ti2\n",
  "<table>\n<tr>\n<td>out<br><table>\n<tr>\n<td>i1</td>\n<td>i2</td>\n</tr>\n</table>\n</td>\n</tr>\n</table>\n",
  note="nested table")
D(tbl(tr(tc("w")), tblpr='<w:tblW w:w="5000" w:type="dxa"/>'), [T([[C("w")]], width=5000)], "w",
  "<table>\n<tr>\n<td>w</td>\n</tr>\n</table>\n")
D(tbl(tr(tc("p")), tblpr='<w:tblW w:w="5000" w:type="pct"/>'), [T([[C("p")]])], "p",
  "<table>\n<tr>\n<td>p</td>\n</tr>\n</table>\n", note="width only for dxa")
D(wp(wr("before")) + tbl(tr(tc("t"))) + wp(wr("after")), [P("before"), T([[C("t")]]), P("after")], "before\nt\nafter",
  "<p>before</p>\n<table>\n<tr>\n<td>t</td>\n</tr>\n</table>\n<p>after</p>\n", note="document order kept")
D(tbl(tr(tc("&lt;x&gt;"))), [T([[C("<x>")]])], "<x>", "<table>\n<tr>\n<td>&lt;x&gt;</td>\n</tr>\n</table>\n")
D(tbl("<w:sdt><w:sdtContent>" + tr("<w:sdt><w:sdtContent>" + tc("s") + "</w:sdtContent></w:sdt>") + "</w:sdtContent></w:sdt>"),
  [T([[C("s")]])], "s", "<table>\n<tr>\n<td>s</td>\n</tr>\n</table>\n", note="content controls around rows and cells")
D("<w:sdt><w:sdtContent>" + wp(wr("in sdt")) + "</w:sdtContent></w:sdt><w:sectPr/>", [P("in sdt")], "in sdt",
  "<p>in sdt</p>\n")

D(wp('<w:hyperlink r:id="rIdH">' + wr("site") + "</w:hyperlink>"), [P("site", [R("site", href="https://example.org/?a=1&b=2")])],
  "site", '<p><a href="https://example.org/?a=1&amp;b=2">site</a></p>\n',
  doc_rels=[("rIdH", "hyperlink", "https://example.org/?a=1&amp;b=2", True)])
D(wp('<w:hyperlink r:id="rIdJ">' + wr("bad") + "</w:hyperlink>"), [P("bad", [R("bad", href="javascript:alert(1)")])],
  "bad", "<p>bad</p>\n", doc_rels=[("rIdJ", "hyperlink", "javascript:alert(1)", True)], note="unsafe scheme not linked")
D(wp('<w:hyperlink w:anchor="sec2">' + wr("jump") + "</w:hyperlink>"), [P("jump", [R("jump", href="#sec2")])], "jump",
  '<p><a href="#sec2">jump</a></p>\n')
D(wp('<w:hyperlink r:id="rIdM">' + wr("mail") + "</w:hyperlink>"), [P("mail", [R("mail", href="mailto:a@example.com")])],
  "mail", '<p><a href="mailto:a@example.com">mail</a></p>\n', doc_rels=[("rIdM", "hyperlink", "mailto:a@example.com", True)])
D(wp('<w:hyperlink r:id="rIdX">' + wr("none") + "</w:hyperlink>"), [P("none")], "none", "<p>none</p>\n",
  note="unknown relationship: no link")
D(wp('<w:hyperlink r:id="rIdH">' + wr("a") + wr("b", "<w:b/>") + "</w:hyperlink>"),
  [P("ab", [R("a", href="https://example.org/"), R("b", bold=True, href="https://example.org/")])], "ab",
  '<p><a href="https://example.org/">a</a><a href="https://example.org/"><strong>b</strong></a></p>\n',
  doc_rels=[("rIdH", "hyperlink", "https://example.org/", True)])

D(wp('<w:hyperlink r:id="rIdA">' + wr("a") + '</w:hyperlink><w:hyperlink r:id="rIdB">' + wr("b") + "</w:hyperlink>"),
  [P("ab", [R("a", href="https://a.example/"), R("b", href="https://b.example/")])], "ab",
  '<p><a href="https://a.example/">a</a><a href="https://b.example/">b</a></p>\n',
  doc_rels=[("rIdA", "hyperlink", "https://a.example/", True), ("rIdB", "hyperlink", "https://b.example/", True)],
  note="runs with different links are not merged")

PNG = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da63f8cfc0000003010100c9fe92ef0000000049454e44ae426082")


def drawing(rid):
    return ('<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
            '<a:graphic><a:graphicData><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            f'<pic:blipFill><a:blip r:embed="{rid}"/></pic:blipFill></pic:pic></a:graphicData></a:graphic>'
            '</wp:inline></w:drawing></w:r>')


IMG = {"id": "rIdI", "name": "word/media/image1.png", "type": "image/png", **digest(PNG)}
PNG_URI = "data:image/png;base64," + b64(PNG)
D(wp(wr("pic: ") + drawing("rIdI")), [P("pic: ", [R("pic: "), R("", image="rIdI")])], "pic: ",
  f'<p>pic: <img src="{PNG_URI}" alt=""></p>\n', images=[IMG],
  doc_rels=[("rIdI", "image", "media/image1.png", False)], media={"word/media/image1.png": PNG})
D(wp(drawing("rIdI")) + wp(drawing("rIdI")), [P("", [R("", image="rIdI")]), P("", [R("", image="rIdI")])], "\n",
  f'<p><img src="{PNG_URI}" alt=""></p>\n<p><img src="{PNG_URI}" alt=""></p>\n', images=[IMG],
  doc_rels=[("rIdI", "image", "media/image1.png", False)], media={"word/media/image1.png": PNG}, note="image listed once")
D(wp(drawing("rIdI")), [P("", [R("", image="rIdI")])], "", "<p></p>\n", options={"extractImages": False},
  doc_rels=[("rIdI", "image", "media/image1.png", False)], media={"word/media/image1.png": PNG})
D(wp(drawing("rIdS")), [P("", [R("", image="rIdS")])], "", "<p></p>\n",
  images=[{"id": "rIdS", "name": "word/media/x.svg", "type": "image/svg+xml", **digest(b"<svg/>")}],
  doc_rels=[("rIdS", "image", "media/x.svg", False)], media={"word/media/x.svg": b"<svg/>"}, note="SVG not embedded in HTML")
D(wp(drawing("rIdE")), [P("", [R("", image="rIdE")])], "", "<p></p>\n",
  doc_rels=[("rIdE", "image", "https://example.org/x.png", True)], note="external image not read")
D(wp(drawing("rIdI")), [P("", [R("", image="rIdI")])], "", "<p></p>\n",
  doc_rels=[("rIdI", "image", "media/missing.png", False)], note="missing image part skipped")
D(wp('<w:r><w:pict><v:shape xmlns:v="urn:schemas-microsoft-com:vml"><v:imagedata r:id="rIdI"/></v:shape></w:pict></w:r>'),
  [P("", [R("", image="rIdI")])], "", f'<p><img src="{PNG_URI}" alt=""></p>\n', images=[IMG],
  doc_rels=[("rIdI", "image", "../word/media/image1.png", False)], media={"word/media/image1.png": PNG},
  note="VML image and relative target")

CORE = ("<dc:title> Laporan </dc:title><dc:subject>Uji</dc:subject><dc:creator>Penulis</dc:creator>"
        "<cp:keywords>a, b;c ,,</cp:keywords><dc:description>desc</dc:description><cp:lastModifiedBy>Editor</cp:lastModifiedBy>"
        '<dcterms:created xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="dcterms:W3CDTF">2026-01-02T03:04:05Z</dcterms:created>'
        "<dcterms:modified>2026-02-03</dcterms:modified>")
META = {"title": "Laporan", "subject": "Uji", "author": "Penulis", "keywords": ["a", "b", "c"], "description": "desc",
        "lastModifiedBy": "Editor", "created": "2026-01-02T03:04:05.000Z", "modified": "2026-02-03T00:00:00.000Z",
        "pageCount": 3, "wordCount": 120, "characterCount": 700}
D(wp(wr("body")), [P("body")], "body", "<h1>Laporan</h1>\n<p>body</p>\n", metadata=META, core=CORE,
  app="<Pages>3</Pages><Words>120</Words><Characters>700</Characters><Application>x</Application>")
D(wp(wr("body")), [P("body")], "body", "<p>body</p>\n", options={"extractMetadata": False}, core=CORE, app="<Pages>3</Pages>")
D(wp(wr("b")), [P("b")], "b", "<p>b</p>\n", metadata={},
  core="<dc:title>   </dc:title><dcterms:created>yesterday</dcterms:created><dcterms:modified>2026-13-45</dcterms:modified>",
  app="<Pages>-1</Pages><Words>1.5</Words>", note="empty or invalid metadata omitted")
D(wp(wr("&lt;t&gt;")), [P("<t>")], "<t>", "<h1>&lt;T&gt; &amp; co</h1>\n<p>&lt;t&gt;</p>\n",
  metadata={"title": "<T> & co"}, core="<dc:title>&lt;T&gt; &amp; co</dc:title>")

add("docx", {"error": "MISSING_PART"}, input=b64(make_zip([("readme.txt", b"no document")])))
add("docx", {"error": "MISSING_PART"}, input=b64(package("", doc_xml=f'{DECL}<w:other xmlns:w="{W}"/>')))
add("docx", {"error": "INVALID_XML"}, input=b64(package("", doc_xml=f'{DECL}<w:document xmlns:w="{W}"><w:body>')))
add("docx", {"error": "INVALID_XML"},
    input=b64(package("", doc_xml=f'{DECL}<!DOCTYPE x [<!ENTITY a "aaaa">]><w:document xmlns:w="{W}"><w:body/></w:document>')),
    note="DTD / entity expansion rejected")
add("docx", {"error": "INVALID_ZIP"}, input=b64(b"PK\x03\x04 truncated"))
D(wp(wr("deep")), [P("deep")], "deep", "<p>deep</p>\n", main="word/main.xml", note="main part found via package relationship")
D(wp(wr("x")), [P("x")], "x", "<p>x</p>\n", prefix="ns0", note="non-standard namespace prefix")
D("", [P("strict")], "strict", "<p>strict</p>\n",
  doc_xml=f'{DECL}<w:document xmlns:w="http://purl.oclc.org/ooxml/wordprocessingml/main"><w:body>{wp(wr("strict"))}</w:body></w:document>',
  note="strict OOXML namespace")
D("", [P("x")], "x", "<p>x</p>\n",
  doc_xml=("﻿" + DECL + f'<w:document xmlns:w="{W}"><w:body>' + wp(wr("x")) + "</w:body></w:document>").encode("utf-16"),
  note="UTF-16 part with BOM")
D(wp(wr("a") + '<mc:AlternateContent><mc:Choice Requires="wps">' + wr("c") + "</mc:Choice><mc:Fallback>" + wr("f")
     + "</mc:Fallback></mc:AlternateContent>"), [P("ac")], "ac", "<p>ac</p>\n", note="first mc:Choice used")
D(wp("<w:r><w:t>  spaced  </w:t></w:r>"), [P("  spaced  ")], "  spaced  ", "<p>  spaced  </p>\n",
  note="text preserved as written")
D(wp(wr("x", "<w:b/>")), [P("x")], "x", "<p>x</p>\n", options={"preserveFormatting": False}, note="formatting dropped")

doc = {
    "name": "lombokdocx-vectors",
    "version": 1,
    "spec": "docs/SPEC_LombokDocx (sections 2-6)",
    "functions": {
        "inflate": "inflateRaw(base64(input), maxSize ?? 2^31-1) -> {size, sha256} | error code",
        "zip": "new ZipReader(base64(input), limits); entries = names in central directory order; read[name] -> {size, sha256} or null; "
               "error cases: call=open (constructor) or call=read (read(name), after readFirst when given)",
        "xml": "parseXML(input, {maxDepth}) -> {name, attributes, children}",
        "docx": "readDocx(base64(input), options) -> blocks, images {id,name,type,size,sha256}, metadata (dates ISO 8601 UTC), "
                "documentToText, renderHTML; objects are compared with sorted keys",
    },
    "cases": cases,
}
out = pathlib.Path(__file__).with_name("lombokdocx-vectors-v1.json")
out.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"{len(cases)} cases -> {out}")
