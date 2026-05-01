'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  Monitor,
  Building,
  ExternalLink,
  Clock,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/ui-utils';

interface AuctionCardProps {
  id?: string;
  county: string;
  state: string;
  date: Date;
  format: 'online' | 'in-person' | string;
  propertyCount: number;
  url?: string | null;
  notes?: string | null;
  isNextAuction?: boolean;
}

export const AuctionCard: React.FC<AuctionCardProps> = ({
  county,
  state,
  date,
  format,
  propertyCount,
  url,
  notes,
  isNextAuction = false
}) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const formatShortDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    const auctionDate = new Date(date);
    const diffTime = auctionDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntil(date);
  const isPast = daysUntil < 0;
  const isToday = daysUntil === 0;
  const isSoon = daysUntil > 0 && daysUntil <= 7;

  const getCountdownColor = () => {
    if (isPast) return 'text-slate-400';
    if (isToday) return 'text-emerald-400';
    if (isSoon) return 'text-amber-400';
    return 'text-blue-400';
  };

  const getCountdownText = () => {
    if (isPast) return 'Auction completed';
    if (isToday) return 'Auction today!';
    if (daysUntil === 1) return '1 day remaining';
    return `${daysUntil} days remaining`;
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl transition-all duration-300',
        'bg-slate-800 border border-slate-700 hover:border-slate-600',
        'hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-1',
        isNextAuction && 'ring-2 ring-emerald-500/50'
      )}
    >
      {/* Top accent bar */}
      <div
        className={cn(
          'h-1 w-full',
          format === 'online' ? 'bg-blue-500' : 'bg-emerald-500'
        )}
      />

      <div className="p-6">
        {/* Header - Date and Format Badge */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              'bg-slate-700 group-hover:bg-slate-600 transition-colors'
            )}>
              <Calendar className="w-6 h-6 text-slate-300" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">
                {formatShortDate(date)}
              </div>
              <div className="text-sm font-medium text-slate-400">
                {date.getFullYear()}
              </div>
            </div>
          </div>

          <span
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider',
              format === 'online'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            )}
          >
            {format === 'online' ? (
              <span className="flex items-center gap-1.5">
                <Monitor className="w-3 h-3" />
                Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Building className="w-3 h-3" />
                In-Person
              </span>
            )}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-slate-300 mb-4">
          <MapPin className="w-4 h-4 text-slate-500" />
          <span className="font-semibold">
            {county}, {state}
          </span>
        </div>

        {/* Full Date */}
        <div className="text-slate-400 text-sm mb-4">
          {formatDate(date)}
        </div>

        {/* Property Count */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 rounded-lg">
            <Building className="w-4 h-4 text-slate-400" />
            <span className="text-white font-bold">{propertyCount}</span>
            <span className="text-slate-400 text-sm">properties</span>
          </div>
        </div>

        {/* Countdown */}
        <div className={cn(
          'flex items-center gap-2 mb-4',
          getCountdownColor()
        )}>
          <Clock className="w-4 h-4" />
          <span className="font-medium">{getCountdownText()}</span>
        </div>

        {/* Notes */}
        {notes && (
          <p className="text-sm text-slate-400 mb-4 line-clamp-2">
            {notes}
          </p>
        )}

        {/* CTA Link */}
        {url && (
          <Link
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center justify-center gap-2 w-full py-3 rounded-xl',
              'font-semibold text-sm transition-all duration-200',
              'bg-slate-700 hover:bg-slate-600 text-white',
              'group/link'
            )}
          >
            <span>View Official Listing</span>
            <ExternalLink className="w-4 h-4 transition-transform group-hover/link:translate-x-0.5" />
          </Link>
        )}

        {!url && (
          <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-800/50 text-slate-500 text-sm font-medium">
            No official link available
          </div>
        )}
      </div>

      {/* Next Auction Badge */}
      {isNextAuction && (
        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
          NEXT AUCTION
        </div>
      )}
    </div>
  );
};

export default AuctionCard;
