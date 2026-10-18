"""Gera docs/wiki/INDICE.md (páginas e links entre elas) e verifica links e âncoras.

Uso, a partir da raiz do repositório:
    python docs/wiki/_scripts/gerar_indice.py          # regenera o índice
    python docs/wiki/_scripts/gerar_indice.py --check  # só verifica; falha com link quebrado ou índice desatualizado

Somente biblioteca padrão. Ver docs/wiki/MANUTENCAO.md.
"""

import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote

WIKI = Path(__file__).resolve().parents[1]
REPO = WIKI.parents[1]
OUTPUT = WIKI / "INDICE.md"
HOME = WIKI / "README.md"

# Nome exibido de cada pasta. Ao criar uma pasta nova, acrescente-a aqui.
SECTIONS = {
    ".": "Entrada e manutenção",
    "01-visao-geral": "1. Visão geral",
    "02-arquitetura": "2. Arquitetura",
    "03-backend": "3. Backend",
    "04-agente": "4. Agente",
    "05-frontend": "5. Frontend",
    "06-operacao": "6. Operação",
}

LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
FENCE = re.compile(r"```.*?```", re.S)
HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$", re.M)


def strip_code(text: str) -> str:
    return FENCE.sub("", text)


def slug(heading: str) -> str:
    """Âncora no estilo do GitHub: minúsculas, sem pontuação, espaços viram hífens."""
    text = heading.replace("`", "").strip().lower()
    text = re.sub(r"[^\w\- ]", "", text)
    return text.replace(" ", "-")


_anchor_cache: dict[Path, set[str]] = {}


def anchors(path: Path) -> set[str]:
    if path not in _anchor_cache:
        seen: dict[str, int] = defaultdict(int)
        result = set()
        for _, title in HEADING.findall(strip_code(path.read_text(encoding="utf-8"))):
            base = slug(title)
            result.add(base if seen[base] == 0 else f"{base}-{seen[base]}")
            seen[base] += 1
        _anchor_cache[path] = result
    return _anchor_cache[path]


def title_of(path: Path) -> str:
    for level, title in HEADING.findall(strip_code(path.read_text(encoding="utf-8"))):
        if level == "#":
            return title.strip()
    return path.stem


def rel(path: Path, base: Path = WIKI) -> str:
    return path.relative_to(base).as_posix()


def section_of(path: Path) -> str:
    parent = rel(path.parent) if path.parent != WIKI else "."
    return parent


def sort_key(path: Path):
    parent = section_of(path)
    return (parent != ".", parent, path.name != "README.md", path.name)


def collect():
    pages = sorted((p for p in WIKI.rglob("*.md") if p != OUTPUT), key=sort_key)
    outgoing: dict[Path, list[Path]] = {p: [] for p in pages}
    external: dict[Path, list[str]] = {p: [] for p in pages}
    broken: list[str] = []
    for page in pages:
        for target in LINK.findall(strip_code(page.read_text(encoding="utf-8"))):
            if target.startswith(("http://", "https://", "mailto:")):
                continue
            path_part, _, anchor = target.partition("#")
            dest = (page.parent / unquote(path_part)).resolve() if path_part else page
            if not dest.exists() and dest != OUTPUT:
                broken.append(f"{rel(page)}: arquivo inexistente -> {target}")
                continue
            if anchor and dest.suffix == ".md" and unquote(anchor) not in anchors(dest):
                broken.append(f"{rel(page)}: âncora inexistente -> {target}")
            if dest == page:
                continue
            if dest.suffix == ".md" and WIKI in dest.parents and dest != OUTPUT:
                if dest not in outgoing[page]:
                    outgoing[page].append(dest)
            else:
                ref = rel(dest, REPO) + ("/" if dest.is_dir() else "")
                if ref not in external[page]:
                    external[page].append(ref)
    incoming: dict[Path, list[Path]] = {p: [] for p in pages}
    for src, dests in outgoing.items():
        for dest in dests:
            incoming[dest].append(src)
    return pages, outgoing, incoming, external, broken


def node_id(path: Path) -> str:
    return "p_" + re.sub(r"\W", "_", rel(path)[:-3])


def label(text: str) -> str:
    return text.replace("`", "").replace('"', "'")


def link(path: Path, titles: dict[Path, str]) -> str:
    return f"[{titles[path]}]({rel(path)})"


def render(pages, outgoing, incoming, external, titles) -> str:
    total_links = sum(len(v) for v in outgoing.values())
    total_refs = len({ref for refs in external.values() for ref in refs})
    lines = [
        "# Índice da wiki",
        "",
        "> **Arquivo gerado.** Não edite à mão: rode",
        "> `python docs/wiki/_scripts/gerar_indice.py` depois de criar, mover ou",
        "> renomear páginas ou de mudar links. Ver [Manutenção da wiki](MANUTENCAO.md).",
        "",
        f"**{len(pages)} páginas · {total_links} links entre páginas · "
        f"{total_refs} arquivos do repositório citados**",
        "",
        "Para começar a ler, use a [Home](README.md).",
        "",
        "## Páginas por seção",
        "",
    ]
    by_section: dict[str, list[Path]] = defaultdict(list)
    for page in pages:
        by_section[section_of(page)].append(page)
    for section, members in by_section.items():
        lines += [f"### {SECTIONS.get(section, section)}", "",
                  "| Página | Arquivo | Links para | Citada por |", "|---|---|---|---|"]
        for page in members:
            lines.append(f"| {link(page, titles)} | `{rel(page)}` | "
                         f"{len(outgoing[page])} | {len(incoming[page])} |")
        lines.append("")

    lines += [
        "## Mapa de links",
        "",
        "Cada seta é um link de uma página para outra. Os links que saem da Home",
        "foram omitidos, porque ela aponta para todas as páginas.",
        "",
        "```mermaid",
        "flowchart LR",
    ]
    for section, members in by_section.items():
        lines.append(f'    subgraph s_{re.sub(r"\W", "_", section)}["{label(SECTIONS.get(section, section))}"]')
        for page in members:
            lines.append(f'      {node_id(page)}["{label(titles[page])}"]')
        lines.append("    end")
    for page in pages:
        if page == HOME:
            continue
        for dest in outgoing[page]:
            lines.append(f"    {node_id(page)} --> {node_id(dest)}")
    lines += ["```", "", "## Links de cada página", ""]

    for page in pages:
        lines += [f"### {link(page, titles)}", ""]
        out = ", ".join(link(p, titles) for p in outgoing[page]) or "—"
        inc = ", ".join(link(p, titles) for p in incoming[page]) or "— (página órfã)"
        lines += [f"- **Links para:** {out}", f"- **Citada por:** {inc}"]
        if external[page]:
            lines.append("- **Arquivos do repositório citados:** "
                         + ", ".join(f"`{ref}`" for ref in external[page]))
        lines.append("")

    orphans = [p for p in pages if p != HOME and not incoming[p]]
    only_home = [p for p in pages if incoming[p] == [HOME]]
    lines += ["## Saúde da wiki", "",
              "| Verificação | Resultado |", "|---|---|",
              "| Páginas órfãs (sem nenhum link de entrada) | "
              + (", ".join(link(p, titles) for p in orphans) or "Nenhuma") + " |",
              "| Páginas citadas só pela Home | "
              + (", ".join(link(p, titles) for p in only_home) or "Nenhuma") + " |",
              "| Links e âncoras quebrados | Nenhum (o script falha se houver) |",
              ""]
    return "\n".join(lines)


def main() -> int:
    sys.stdout.reconfigure(errors="replace")
    check_only = "--check" in sys.argv[1:]
    pages, outgoing, incoming, external, broken = collect()
    titles = {p: title_of(p) for p in pages}
    content = render(pages, outgoing, incoming, external, titles)

    for problem in broken:
        print(f"QUEBRADO  {problem}")
    if check_only:
        current = OUTPUT.read_text(encoding="utf-8") if OUTPUT.exists() else ""
        stale = current != content
        if stale:
            print("DESATUALIZADO  INDICE.md não corresponde às páginas; rode o script sem --check.")
        print(f"{len(pages)} páginas verificadas; {len(broken)} problema(s) de link.")
        return 1 if broken or stale else 0

    OUTPUT.write_text(content, encoding="utf-8", newline="\n")
    print(f"INDICE.md gerado: {len(pages)} páginas, {sum(len(v) for v in outgoing.values())} links entre páginas.")
    if broken:
        print(f"{len(broken)} problema(s) de link; corrija e rode de novo.")
    return 1 if broken else 0


if __name__ == "__main__":
    raise SystemExit(main())
