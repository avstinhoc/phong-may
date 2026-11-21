"""Assemble the classroom presentations from the supplied Drive editions and our slide overlays."""
import base64
import hashlib
import io
import json
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import time
import urllib.request
import zipfile
import zlib

here = Path(__file__).resolve().parent
destination = here.parents[1] / 'public' / 'ic3-slides'
destination.mkdir(parents=True, exist_ok=True)
manifest = json.loads((here / 'files.json').read_text())

def assemble(entry):
    number, metadata = entry
    output = destination / f'Bai-{number}.pptx'
    if output.is_file() and zipfile.is_zipfile(output):
        return
    patch = json.loads(zlib.decompress(base64.b64decode((here / f'{number}.patch').read_bytes())))
    source = None
    if metadata:
        url = 'https://drive.usercontent.google.com/download?export=download&confirm=t&id=' + metadata['id']
        for attempt in range(3):
            try:
                with urllib.request.urlopen(url, timeout=90) as response:
                    data = response.read()
                if hashlib.sha256(data).hexdigest() != metadata['sha']:
                    raise ValueError(f'Bài {number}: tệp nguồn đã thay đổi')
                source = zipfile.ZipFile(io.BytesIO(data))
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(2 ** attempt)
    tmp = output.with_suffix('.tmp')
    with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED,compresslevel=2) as deck:
        if source:
            with source:
                for name in source.namelist():
                    if name not in patch:
                        deck.writestr(name,source.read(name))
        for name, encoded in patch.items():
            deck.writestr(name,base64.b64decode(encoded))
    os.replace(tmp,output)
with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(assemble,manifest.items()))
# Pre-rendered classroom pages keep all original diagrams readable in WebView, including offline.
for archive in sorted((here / 'preview').glob('*.zip')):
    with zipfile.ZipFile(archive) as pages:
        pages.extractall(destination)
