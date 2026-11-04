# Setup Guide — fresh machine

Everything needed to run this repo from scratch (Ubuntu/Debian, tested on Ubuntu 24.04).

## 1. ffmpeg
```bash
sudo apt-get update && sudo apt-get install -y ffmpeg
ffmpeg -version   # expect 6.x
```

## 2. Fonts (Hindi/Devanagari on-screen text)
```bash
sudo apt-get install -y fonts-noto-core fonts-noto-extra
fc-list | grep -i devanagari
```

## 3. TTS (Piper — fast, local, Hindi + English)
```bash
pip install piper-tts
mkdir -p ~/.local/share/piper-voices
BASE=https://huggingface.co/rhasspy/piper-voices/resolve/main
for v in hi/hi_IN/pratham/medium/hi_IN-pratham-medium \
         en/en_US/lessac/medium/en_US-lessac-medium \
         en/en_US/ryan/high/en_US-ryan-high; do
  f=$(basename $v)
  curl -sL -o ~/.local/share/piper-voices/$f.onnx "$BASE/$v.onnx"
  curl -sL -o ~/.local/share/piper-voices/$f.onnx.json "$BASE/$v.onnx.json"
done
```

## 4. Obscura (headless browser → PNG backgrounds)
```bash
curl -LO https://github.com/h4ckf0r0day/obscura/releases/latest/download/obscura-x86_64-linux.tar.gz
tar xzf obscura-x86_64-linux.tar.gz
./obscura --version
```
Binary stays in the repo root (gitignored). Linux builds need glibc 2.35+.

## 5. Global shortcuts (optional)
```bash
mkdir -p ~/.local/bin
ln -sf "$PWD/scripts/tts"      ~/.local/bin/tts
ln -sf "$PWD/scripts/tmpfiles" ~/.local/bin/tmpfiles
```

## 6. Verify everything
```bash
ffmpeg -version | head -1
fc-list | grep -ci devanagari
tts -l hi "नमस्ते" && ffmpeg -i tts-*.wav -f null -
./obscura --version
./scripts/math-short.sh --no-upload
```

## 7. OpenCode skills + MCP
- Skills live in `.opencode/skills/` (ffmpeg, shorts, captions, thumbnail, remotion, obscura) — loaded automatically
- Exa MCP is configured in `opencode.json`; run `/mcps` in OpenCode to connect/authenticate
