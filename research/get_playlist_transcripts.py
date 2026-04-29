#!/usr/bin/env python3
"""Extract transcripts from Title Research Series and Live Auction walkthroughs"""

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import os

formatter = TextFormatter()
api = YouTubeTranscriptApi()

# Title Research Series - his exact title research workflow step by step
video_ids_title_research = [
    "H9Oe1qRades",  # Tax Deed Title Explained | Quick and Dirty Tutorial
    "j0ikOuLEeH4",  # Tax Deed Title For Beginners _ Biggest Mistakes
    "__8T-__bsPs",  # Tax Deed Title Research! Avoid Disasters!
    "3yvUzm4v4EU",  # Tax Deed Title 101 | Avoid Costly Dangers
    "VAWeTjMqiqQ",  # Tax Deed Title Explained
    "Uho0svwBAeg",  # Buy Houses Pennies On The Dollar | Title Break Down
    "IF99rj0wl0E",  # Beginners Guide To Clearing Tax Deed Title
    "iQK5TqiMfYw",  # Tax Deed Title Clearing In 5 Quick Steps
    "6IAi_pcEgFY",  # The 2 Minute Wholesale Title Search Strategy
    "l8pUGxWQzR4",  # Tax Deed Title Search | Full Process | Watch me LIVE!
    "FbS5ft89BZs",  # TLTV 003: Title Companies...Do You Need Them?
]

# Live Auction walkthroughs - his real property research process live
video_ids_live_auctions = [
    "Qy4WAtnDKLQ",  # Buy Cheap Government Seized Houses $5k-30k
    "Mgoh33YMgLg",  # Buy Dirt Cheap Texas Houses Under $7,000
    "2XyV8KTTxmw",  # Where to Buy Over-the-Counter Tax Deeds Today
    "8vbgGdWCuYc",  # Buy Government Seized Land Under $700
    "2di3ACfVLr8",  # Live Auction! $100k House Only $1000 Bid
    "3Pvj4ulbBjE",  # Buy Cheap $100-$500 Land | Flip For Quick Cash
    "816rLEdIoEo",  # Buy Cheap Tax Deed Property | Locations Revealed
    "GADQr7Qkb2Y",  # Buy Cheap $5,000 Gov Auction Houses Up To 90% Off
    "rVn_LGHcG1I",  # Tax Deed Alert!! Gov Shutdown = Cheap House
    "HtdmJmm3eIo",  # Buy A $2,000 Tax Deed House Worth $50,000
    "SrXQgNUi0Mc",  # Buy Cheap Tax Deeds This Week
    "T-aeZGQX48w",  # Buy A $31,000 Tax Deed House Worth $190k
    "d7ALdrP3pSY",  # Buy A $1677 House Worth $71,800
    "ez1fk3hDwqI",  # Buy Cheap Gov Property For $2.00
    "pVzTwYXeLu8",  # Buy Cheap Texas Gov Houses Under $5k
]

playlists = {
    "title_research": video_ids_title_research,
    "live_auctions": video_ids_live_auctions,
}

print("="*60)
print("Extracting YouTube Transcripts")
print("Source: Dustin Hahn Title Research + Live Auction Series")
print("="*60 + "\n")

total_words = 0

for playlist_name, video_ids in playlists.items():
    os.makedirs(f"research/transcripts/{playlist_name}", exist_ok=True)
    success = 0
    words = 0

    print(f"\n{'='*60}")
    print(f"Playlist: {playlist_name}")
    print(f"{'='*60}")

    for video_id in video_ids:
        try:
            transcript = api.fetch(video_id)
            text = formatter.format_transcript(transcript)

            filepath = f"research/transcripts/{playlist_name}/{video_id}.txt"
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(f"VIDEO ID: {video_id}\n")
                f.write(f"PLAYLIST: {playlist_name}\n")
                f.write(f"URL: https://youtube.com/watch?v={video_id}\n")
                f.write("="*50 + "\n\n")
                f.write(text)

            word_count = len(text.split())
            words += word_count
            success += 1
            print(f"✅ {video_id}: {word_count:,} words")

        except Exception as e:
            print(f"❌ {video_id}: {str(e)[:80]}")

    print(f"\n{playlist_name}: {success}/{len(video_ids)} successful, {words:,} words")
    total_words += words

print(f"\n{'='*60}")
print(f"TOTAL: {total_words:,} words extracted")
print("="*60)
