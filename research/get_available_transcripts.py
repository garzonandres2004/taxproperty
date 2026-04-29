#!/usr/bin/env python3
"""Extract transcripts from available Title Research and Live Auction videos"""

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import os

formatter = TextFormatter()
api = YouTubeTranscriptApi()

# Available Title Research videos
title_research_videos = [
    ("H9Oe1qRades", "Tax Deed Title Explained | Quick and Dirty Tutorial"),
    ("j0ikOuLEeH4", "Tax Deed Title For Beginners _ Biggest Mistakes"),
    ("3yvUzm4v4EU", "Tax Deed Title 101 | Avoid Costly Dangers"),
    ("VAWeTjMqiqQ", "Tax Deed Title Explained"),
    ("Uho0svwBAeg", "Buy Houses Pennies On The Dollar | Tax Deed Title Break Down"),
    ("IF99rj0wl0E", "Beginners Guide To Clearing Tax Deed Title"),
    ("iQK5TqiMfYw", "Tax Deed Title Clearing In 5 Quick Steps"),
    ("N_UJ52JVADk", "Tax Deed Research Pro Tip! Profits Unleashed"),
]

# Available Live Auction/Gov Property videos
live_auction_videos = [
    ("2di3ACfVLr8", "Live Auction Now! $100k Tax Deed House Only $1000 Bid"),
    ("l__0JhbtyB4", "65% Off Houses! Gov Tax Deed Auctions (Investor Frenzy)"),
    ("tvNQm8FHpF4", "Buy Cheap Tax Deed Gov Auction Houses Here 90% Off Market Value"),
    ("s4K6Ik9Y5g0", "Gov Auctions Exposed! $5000 House Worth 100k"),
    ("XKc1p8YfWao", "Buy Cheap $5,000 Gov Auction Houses Here! Up To 90% Off"),
    ("B68cDiQRUdg", "Tax Deed Auction Hot Spots | Upcoming Auctions Episode #1"),
    ("0Lno_MwFRq0", "Tax Deed Investing Beyond The Auction Block"),
    ("iTLXARzgueo", "Texas Tax Deed Secrets - 10 Hot Online Auctions"),
    ("MY14LLYp1D8", "Texas Government Auction Property Risks | Explained"),
    ("5tH2PHYnRf0", "Wild Auction Property Deals With Michigan Tax Deeds"),
    ("3oy-TiGc6I0", "Tax Deed Auction Field Kit! (Crush Profits Like A Pro)"),
    ("uibbUX0oFS0", "VITAL In Person Tax Deed Auction Tips"),
    ("jJGAEtS9bRc", "Tax Deed Auction Prep 101"),
    ("jYEu-u32BnE", "1 Key To Dominate Tax Lien Auctions Like A Boss"),
    ("eRcsU9QmZNY", "Buy A $2k House? 500 San Diego Auction Homes Going Up For Auction"),
    ("ZB0xrEoaVE8", "Alert! Tax Deed Auction! $2k Bid ($150K House)"),
    ("NhzmuljWe1Y", "Texas Gov Auction Property Exposed! 90% Off This 750K Property"),
    ("5W7N3OfyAio", "Hot New Gov Tax Deed Auctions! Cheap Houses (This Week Only)"),
    ("7f6CAOHvbtA", "$265,000 Houses Selling for 65% Off at Gov Tax Deed Auctions"),
    ("YBdHhkDvo48", "Buy A Cheap $474 Tax Deed? ($100k Value | Secret Auction)"),
]

playlists = {
    "title_research": title_research_videos,
    "live_auctions": live_auction_videos,
}

print("="*60)
print("Extracting YouTube Transcripts")
print("Source: Dustin Hahn - Title Research + Live Auction Videos")
print("="*60 + "\n")

total_words = 0

for playlist_name, videos in playlists.items():
    os.makedirs(f"research/transcripts/{playlist_name}", exist_ok=True)
    success = 0
    words = 0

    print(f"\n{'='*60}")
    print(f"Playlist: {playlist_name}")
    print(f"{'='*60}")

    for video_id, title in videos:
        try:
            transcript = api.fetch(video_id)
            text = formatter.format_transcript(transcript)

            filepath = f"research/transcripts/{playlist_name}/{video_id}.txt"
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(f"VIDEO ID: {video_id}\n")
                f.write(f"TITLE: {title}\n")
                f.write(f"PLAYLIST: {playlist_name}\n")
                f.write(f"URL: https://youtube.com/watch?v={video_id}\n")
                f.write("="*50 + "\n\n")
                f.write(text)

            word_count = len(text.split())
            words += word_count
            success += 1
            print(f"✅ {video_id}: {word_count:,} words - {title[:50]}...")

        except Exception as e:
            print(f"❌ {video_id}: {str(e)[:60]} - {title[:40]}...")

    print(f"\n{playlist_name}: {success}/{len(videos)} successful, {words:,} words")
    total_words += words

print(f"\n{'='*60}")
print(f"TOTAL: {total_words:,} words extracted")
print("="*60)
