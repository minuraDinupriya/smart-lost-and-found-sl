"""Assemble browser clips and burn in the generated captions."""

import json
from pathlib import Path
import subprocess


media = Path(__file__).resolve().parent
clips = media.parent.parent / 'client' / 'test-results' / 'walkthrough'


def timestamp(seconds):
    minutes, millis = divmod(round(seconds * 1000), 60_000)
    hours, minutes = divmod(minutes, 60)
    seconds, millis = divmod(millis, 1000)
    return f'{hours:02}:{minutes:02}:{seconds:02},{millis:03}'


def duration(file):
    return float(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', str(file),
    ], text=True))


def main():
    chapters = json.loads((clips / 'captions.json').read_text(encoding='utf-8'))
    playlist = []
    captions = []
    elapsed = 0.0

    for chapter in chapters:
        clip = clips / f"{chapter['name']}.webm"
        length = duration(clip)
        playlist.append(f"file '{clip.name}'")
        for i, cue in enumerate(chapter['captions']):
            next_offset = (chapter['captions'][i + 1]['offset']
                           if i + 1 < len(chapter['captions']) else length)
            start = timestamp(elapsed + cue['offset'])
            end = timestamp(elapsed + min(next_offset, length))
            if start >= end:
                raise ValueError(f'Invalid caption interval in {clip.name}: {cue}')
            captions.append(f"{len(captions) + 1}\n{start} --> {end}\n{cue['caption']}\n")
        elapsed += length

    (clips / 'walkthrough.ffconcat').write_text('\n'.join(playlist) + '\n', encoding='utf-8')
    captions_text = '\n'.join(captions)
    (clips / 'captions.srt').write_text(captions_text, encoding='utf-8')
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'concat', '-safe', '1', '-i', 'walkthrough.ffconcat',
        '-vf', 'pad=iw:ih+72:0:0:color=0x0f172a,'
        "subtitles=captions.srt:force_style='FontName=Arial,FontSize=12,Outline=0,Shadow=0,MarginV=10'",
        '-c:v', 'libx264', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
        str(media / 'demo-walkthrough.mp4'),
    ], cwd=clips, check=True)
    (media / 'demo-walkthrough.srt').write_text(captions_text, encoding='utf-8')


if __name__ == '__main__':
    main()
