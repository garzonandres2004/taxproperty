#!/usr/bin/env python3
"""Extract YouTube transcripts from Dustin Hahn videos for research"""

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import os
import json

# Target videos - most relevant for product research
video_ids = [
    "N_UJ52JVADk",  # Tax Deed Research Pro Tip! Profits Unleashed
    "j0ikOuLEeH4",  # Tax Deed Title For Beginners - Biggest Mistakes
    "e39Y_NXDxXk",  # #1 Tax Deed Mistake To Avoid! (People Lose Millions)
    "xoBpVMTWNd8",  # Warning! Tax Deed Mistakes To Avoid
    "5RJylhmyFtI",  # Beginner Tax Deed Investing (Step By Step)
    "ojnVKMFg-2w",  # Buy Cheap Gov Seized Property Fast! Easy Beginner Steps
    "YVYW5E5cTUI",  # How To Find OTC Tax Deeds From Home?
    "VzXgMotOyx4",  # Beginner Tax Deed States
    "r90IyD3xUSM",  # Beginner Tax Lien Locations Revealed!
    "jPUxURWYu7A",  # Tax Liens Vs Tax Deeds Smackdown!
    "I6cRNYvbD4U",  # Tax Deed Hybrid States Explained
    "FVGyrgWnlFs",  # Buy Florida Tax Liens Here Fast! 18% ROI
    "Q8QzePtzNnc",  # Tax Liens for Rookies!
    "pMdNVJrCVUI",  # Tax Lien Investing Wealth Blueprint
    "HB64ePrkJQ0",  # Exposed! Secret Tax Deed Sale ($391.00 Bids)
    "jO2uLeVC1g8",  # Buy Government Tax Liens Today Up to 36% ROI
]

os.makedirs("research/transcripts", exist_ok=True)
formatter = TextFormatter()
api = YouTubeTranscriptApi()

results = []
print("="*60)
print("Extracting YouTube Transcripts for Research")
print("Source: Dustin Hahn Tax Lien & Deed Videos")
print("="*60 + "\n")

for video_id in video_ids:
    try:
        # New API v1.0+: instantiate then call fetch
        transcript = api.fetch(video_id)
        text = formatter.format_transcript(transcript)

        filename = f"research/transcripts/{video_id}.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"VIDEO ID: {video_id}\n")
            f.write(f"URL: https://youtube.com/watch?v={video_id}\n")
            f.write("="*50 + "\n\n")
            f.write(text)

        word_count = len(text.split())
        results.append({
            "id": video_id,
            "words": word_count,
            "status": "success",
            "url": f"https://youtube.com/watch?v={video_id}"
        })
        print(f"✅ {video_id}: {word_count:,} words")

    except Exception as e:
        error_msg = str(e)
        results.append({
            "id": video_id,
            "error": error_msg,
            "status": "failed"
        })
        print(f"❌ {video_id}: {error_msg[:100]}")

print("\n" + "="*60)
success_count = sum(1 for r in results if r['status']=='success')
print(f"SUMMARY: {success_count}/{len(results)} transcripts extracted")
print(f"Total words: {sum(r.get('words', 0) for r in results):,}")
print("="*60)

with open("research/transcripts/summary.json", 'w') as f:
    json.dump(results, f, indent=2)

print("\nTranscripts saved to: research/transcripts/")
