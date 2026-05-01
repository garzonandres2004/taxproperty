'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  Filter,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { AuctionCard } from '@/components/auction/AuctionCard';
import { cn } from '@/lib/ui-utils';

interface Auction {
  id: string;
  county: string;
  state: string;
  auction_date: string;
  format: 'online' | 'in-person';
  property_count: number;
  url: string | null;
  notes: string | null;
}

export default function CalendarPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState('All');
  const [filterFormat, setFilterFormat] = useState('All');
  const [dateRange, setDateRange] = useState<'upcoming' | 'all' | 'past'>('upcoming');

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/auctions');
      if (!res.ok) {
        throw new Error('Failed to fetch auctions');
      }
      const data = await res.json();
      setAuctions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort auctions
  const filteredAuctions = auctions.filter((auction) => {
    const matchesState = filterState === 'All' || auction.state === filterState;
    const matchesFormat = filterFormat === 'All' || auction.format === filterFormat;

    const auctionDate = new Date(auction.auction_date);
    const now = new Date();
    const isPast = auctionDate < now;

    const matchesDateRange =
      dateRange === 'all' ? true :
      dateRange === 'upcoming' ? !isPast :
      isPast;

    return matchesState && matchesFormat && matchesDateRange;
  }).sort((a, b) => {
    return new Date(a.auction_date).getTime() - new Date(b.auction_date).getTime();
  });

  // Find the next upcoming auction
  const now = new Date();
  const nextAuctionIndex = filteredAuctions.findIndex(
    (a) => new Date(a.auction_date) > now
  );

  // Countdown to next auction
  const getNextAuctionCountdown = () => {
    const upcoming = filteredAuctions.find((a) => new Date(a.auction_date) > now);
    if (!upcoming) return null;

    const auctionDate = new Date(upcoming.auction_date);
    const diffTime = auctionDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      days: diffDays,
      auction: upcoming
    };
  };

  const countdown = getNextAuctionCountdown();

  // Get unique states for filter
  const states = ['All', ...Array.from(new Set(auctions.map((a) => a.state)))];

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-slate-900">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex items-center justify-center h-96">
              <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-900 -mx-6 -my-10 lg:-mx-10 lg:-my-10">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-semibold">Tax Sale Calendar</span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight">
                Auction Calendar
              </h1>

              <p className="text-slate-400 text-lg mb-8">
                Track upcoming tax sales across counties and states.
                Never miss an opportunity.
              </p>

              {/* Countdown Timer */}
              {countdown && countdown.days > 0 && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 max-w-lg mx-auto">
                  <div className="text-sm text-slate-400 mb-2">Next auction in</div>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-black text-white">{countdown.days}</span>
                    <span className="text-xl text-slate-400">{countdown.days === 1 ? 'day' : 'days'}</span>
                  </div>
                  <div className="text-slate-300 mt-2 font-medium">
                    {countdown.auction.county}, {countdown.auction.state}
                  </div>
                  <div className="text-slate-500 text-sm">
                    {new Date(countdown.auction.auction_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-slate-400" />
              <span className="text-slate-400 font-medium">Filter by:</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* State Filter */}
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state === 'All' ? 'All States' : state}
                  </option>
                ))}
              </select>

              {/* Format Filter */}
              <select
                value={filterFormat}
                onChange={(e) => setFilterFormat(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="All">All Formats</option>
                <option value="online">Online</option>
                <option value="in-person">In-Person</option>
              </select>

              {/* Date Range Filter */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as 'upcoming' | 'all' | 'past')}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="upcoming">Upcoming Only</option>
                <option value="all">All Auctions</option>
                <option value="past">Past Auctions</option>
              </select>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Failed to load auctions</span>
              </div>
              <p className="text-red-400/70 text-sm mt-2">{error}</p>
              <button
                onClick={fetchAuctions}
                className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="text-2xl font-black text-white">{filteredAuctions.length}</div>
              <div className="text-sm text-slate-400">Auctions</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="text-2xl font-black text-white">
                {filteredAuctions.reduce((sum, a) => sum + a.property_count, 0)}
              </div>
              <div className="text-sm text-slate-400">Total Properties</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="text-2xl font-black text-emerald-400">
                {filteredAuctions.filter((a) => new Date(a.auction_date) > now).length}
              </div>
              <div className="text-sm text-slate-400">Upcoming</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="text-2xl font-black text-blue-400">
                {filteredAuctions.filter((a) => a.format === 'online').length}
              </div>
              <div className="text-sm text-slate-400">Online</div>
            </div>
          </div>

          {/* Auction Grid */}
          {filteredAuctions.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No auctions found</h3>
              <p className="text-slate-400">
                Try adjusting your filters or check back later for new listings.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAuctions.map((auction, index) => (
                <AuctionCard
                  key={auction.id}
                  id={auction.id}
                  county={auction.county}
                  state={auction.state}
                  date={new Date(auction.auction_date)}
                  format={auction.format}
                  propertyCount={auction.property_count}
                  url={auction.url}
                  notes={auction.notes}
                  isNextAuction={
                    dateRange !== 'past' &&
                    index === nextAuctionIndex &&
                    new Date(auction.auction_date) > now
                  }
                />
              ))}
            </div>
          )}

          {/* Featured Utah County Auction */}
          <div className="mt-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-emerald-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-white">Featured: Utah County, Utah</h2>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold uppercase">
                      Next Major Sale
                    </span>
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold uppercase">
                      Online
                    </span>
                  </div>

                  <h3 className="text-3xl font-black text-white mb-2">
                    Utah County Tax Sale
                  </h3>

                  <div className="flex items-center gap-2 text-slate-300 mb-4">
                    <MapPin className="w-5 h-5" />
                    <span className="text-lg">Utah County, Utah</span>
                  </div>

                  <div className="text-4xl font-black text-white mb-2">
                    May 21, 2026
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span>10:00 AM MDT</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-1 rounded-lg">
                      <span className="text-white font-bold">127</span>
                      <span className="text-slate-400">properties</span>
                    </div>
                  </div>

                  <a
                    href="https://www.utahcounty.gov/Dept/ClerkAud/TaxSaleInfo.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-2 px-6 py-3 rounded-xl',
                      'bg-emerald-600 hover:bg-emerald-500 text-white',
                      'font-semibold transition-all duration-200'
                    )}
                  >
                    View Official Listing
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-white mb-4">Sale Details</h4>

                  <ul className="space-y-3 text-slate-300">
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full mt-2"></span>
                      <span>Online bidding through Utah County portal</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full mt-2"></span>
                      <span>Deposit required: $500 per property</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full mt-2"></span>
                      <span>Redemption period: 4 years for residential</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full mt-2"></span>
                      <span>Properties may be redeemed until sale starts</span>
                    </li>
                  </ul>

                  <div className="mt-6 pt-6 border-t border-slate-700">
                    <Link
                      href="/properties"
                      className="flex items-center justify-between text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      <span>View 127 properties for this sale</span>
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
