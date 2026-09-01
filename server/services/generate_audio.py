import asyncio
import json
import sys
import os
import re
import edge_tts


def clean_text_for_tts(text: str) -> str:
    """
    Prepare narration text for Edge-TTS plain-text mode.
    - Converts <break time="Xs"/> SSML tags into ellipsis pauses.
    - Strips any remaining HTML/SSML tags.
    - Collapses excess whitespace.
    """
    # Replace SSML break tags with timed ellipsis pauses
    # <break time="1s"/> → "  ...  " (long pause)
    # <break time="0.5s"/> → " ... " (short pause)
    def replace_break(m):
        raw = m.group(1)
        unit = m.group(2) or 's'
        val = float(raw)
        secs = val / 1000 if unit.lower() == 'ms' else val
        if secs >= 1.0:
            return '  ...  '
        return ' ... '

    text = re.sub(
        r'<break\s+time=["\'](\d+(?:\.\d+)?)(s|ms)?["\']\s*/>',
        replace_break,
        text,
        flags=re.IGNORECASE
    )
    # Strip remaining tags
    text = re.sub(r'<[^>]+>', '', text)
    # Normalise whitespace
    text = re.sub(r'[ \t]+', ' ', text).strip()
    return text


async def synthesize(text: str, voice: str, audio_path: str, meta_path: str):
    clean = clean_text_for_tts(text)

    communicate = edge_tts.Communicate(text=clean, voice=voice)

    subtitles = []
    last_end_sec = 0.0

    with open(audio_path, 'wb') as audio_file:
        async for chunk in communicate.stream():
            if chunk['type'] == 'audio':
                audio_file.write(chunk['data'])
            elif chunk['type'] == 'WordBoundary':
                # Timestamps are in 100-nanosecond units
                start_sec = chunk['offset'] / 10_000_000
                dur_sec   = chunk['duration'] / 10_000_000
                end_sec   = start_sec + dur_sec
                subtitles.append({
                    'text':  chunk['text'],
                    'start': round(start_sec, 3),
                    'end':   round(end_sec, 3),
                    # Also expose in milliseconds for Remotion interpolate()
                    'startMs': round(start_sec * 1000),
                    'endMs':   round(end_sec * 1000),
                })
                if end_sec > last_end_sec:
                    last_end_sec = end_sec

    # Duration = last word end + small tail silence
    duration_sec = round(last_end_sec + 0.25, 3) if subtitles else 5.0

    result = {
        'audioFile':   os.path.basename(audio_path),
        'durationSec': duration_sec,
        'subtitles':   subtitles,
    }

    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    # Print JSON result for Node.js to capture via stdout
    print(json.dumps({'success': True, 'result': result}), flush=True)


if __name__ == '__main__':
    if len(sys.argv) < 5:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python generate_audio.py <text_file> <voice> <audio_out> <meta_out>'
        }), flush=True)
        sys.exit(1)

    text_file  = sys.argv[1]
    voice_name = sys.argv[2]
    audio_out  = sys.argv[3]
    meta_out   = sys.argv[4]

    try:
        with open(text_file, 'r', encoding='utf-8') as f:
            input_text = f.read()
        asyncio.run(synthesize(input_text, voice_name, audio_out, meta_out))
    except Exception as exc:
        print(json.dumps({'success': False, 'error': str(exc)}), flush=True)
        sys.exit(1)
